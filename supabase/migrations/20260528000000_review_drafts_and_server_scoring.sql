-- =====================================================================
-- INNOPARK — server-computed review scoring + draft support
-- =====================================================================
-- Fixes:
--   * upsert_review now computes final_score / classification server-side
--     from project_review_scores × criteria × dimensions, so a tampered
--     client can no longer write an inflated final_score.
--   * Drafts: p_submit = false leaves submitted_at NULL and skips the
--     completeness check. p_submit = true requires every active criterion
--     in every active dimension to be rated.
--   * judge_projects view exposes a new has_draft flag separate from the
--     submitted reviewed_by_me flag.
-- =====================================================================

set search_path = public;

create or replace function upsert_review(
  p_project_id uuid,
  p_scores     jsonb,
  p_final      numeric default null,   -- accepted but recomputed server-side
  p_class      text    default null,   -- accepted but recomputed server-side
  p_notes      text    default null,
  p_submit     boolean default false
) returns project_reviews
language plpgsql security definer set search_path = public as $$
declare
  v_review  project_reviews;
  v_final   numeric;
  v_class   text;
  v_missing int;
begin
  perform p_final;
  perform p_class;

  if not is_judge() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not exists (select 1 from projects where id = p_project_id and status = 'approved') then
    raise exception 'project not approved' using errcode = '42501';
  end if;

  insert into project_reviews (project_id, judge_id, notes)
  values (p_project_id, auth.uid(), p_notes)
  on conflict (project_id, judge_id) do update
    set notes = coalesce(excluded.notes, project_reviews.notes)
  returning * into v_review;

  delete from project_review_scores where review_id = v_review.id;
  insert into project_review_scores (review_id, criterion_id, score)
  select v_review.id, (s->>'criterion_id')::uuid, (s->>'score')::int
  from jsonb_array_elements(coalesce(p_scores, '[]'::jsonb)) s
  where exists (
    select 1 from criteria c
    join dimensions d on d.id = c.dimension_id
    where c.id = (s->>'criterion_id')::uuid
      and c.is_active and d.is_active
  );

  if p_submit then
    select count(*) into v_missing
    from criteria c
    join dimensions d on d.id = c.dimension_id
    where c.is_active and d.is_active
      and not exists (
        select 1 from project_review_scores prs
        where prs.review_id = v_review.id and prs.criterion_id = c.id
      );
    if v_missing > 0 then
      raise exception 'review incomplete: % unrated criterion(s)', v_missing
        using errcode = '23514';
    end if;
  end if;

  select round(coalesce(sum((avg_score / 5) * weight), 0)::numeric, 1)
    into v_final
  from (
    select d.weight, avg(prs.score::numeric) as avg_score
    from project_review_scores prs
    join criteria   c on c.id = prs.criterion_id
    join dimensions d on d.id = c.dimension_id
    where prs.review_id = v_review.id and d.is_active and c.is_active
    group by d.id, d.weight
  ) per_dim;

  v_class := case
    when v_final < 40 then 'غير جاهز'
    when v_final < 60 then 'مبكر جداً'
    when v_final < 75 then 'جاهز للاحتضان'
    when v_final < 85 then 'متقدم'
    else                   'عالي النضج'
  end;

  update project_reviews pr set
    final_score    = v_final,
    classification = v_class,
    submitted_at   = case when p_submit then now() else pr.submitted_at end
  where pr.id = v_review.id
  returning * into v_review;

  return v_review;
end $$;

grant execute on function upsert_review to authenticated;

create or replace view judge_projects
with (security_invoker = true) as
select
  p.id,
  p.project_number,
  p.project_name,
  p.project_type,
  p.applicant_name,
  p.department,
  p.description,
  p.created_at,
  exists (
    select 1 from project_reviews r
    where r.project_id = p.id and r.judge_id = auth.uid()
      and r.submitted_at is not null
  ) as reviewed_by_me,
  exists (
    select 1 from project_reviews r
    where r.project_id = p.id and r.judge_id = auth.uid()
      and r.submitted_at is null
  ) as has_draft
from projects p
where p.status = 'approved';

grant select on judge_projects to authenticated;
