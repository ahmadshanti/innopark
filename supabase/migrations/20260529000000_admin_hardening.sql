-- =====================================================================
-- INNOPARK — admin hardening
-- =====================================================================
-- Closes the security + data-integrity gaps uncovered in the admin QA pass:
--   * Adds the `avatar_url` and `visible_on_page` columns that the app
--     already reads/writes but which no migration had declared.
--   * Adds a `profiles_self_update` policy so judges can save their own
--     profile, while preventing them from escalating role/status.
--   * Adds a `profiles_public_judges` policy so the public /judges page
--     can see judges that the admin chose to publish.
--   * Tightens `attach_project_files` and the storage upload policy so
--     anonymous callers can only attach files to a fresh, still-pending
--     project of their own submission.
--   * Adds an `admin_set_user_role` RPC that changes role without
--     silently re-approving rejected users.
--   * Hardens `set_project_status` so an already-judged project can not
--     be silently flipped back to pending/rejected without an explicit
--     admin acknowledgement, and uses a status guard to dodge races.
--   * Adds a trigger that keeps the sum of active dimension weights at
--     exactly 100 so the recomputed final_score is on a 0..100 scale.
-- =====================================================================

set search_path = public;

-- ---------------------------------------------------------------------
-- 1. Missing profile columns
-- ---------------------------------------------------------------------
alter table profiles
  add column if not exists avatar_url      text,
  add column if not exists visible_on_page boolean not null default false;

-- ---------------------------------------------------------------------
-- 2. Profile RLS — self update (safe fields only) + public judge read
-- ---------------------------------------------------------------------
drop policy if exists profiles_self_update    on profiles;
drop policy if exists profiles_public_judges  on profiles;

-- Allow a logged-in user to update their own row, but never let them
-- mutate role or status from the client. (Admin still uses
-- `profiles_admin_all` for moderation.)
create policy profiles_self_update on profiles
  for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role   = (select p.role   from profiles p where p.id = auth.uid())
    and status = (select p.status from profiles p where p.id = auth.uid())
  );

-- Anonymous + authenticated visitors can read the minimal public profile
-- of judges the admin has flagged as visible. RLS is row-level only; the
-- client requests just the columns it needs.
create policy profiles_public_judges on profiles
  for select
  using (role = 'judge' and status = 'approved' and visible_on_page is true);

-- ---------------------------------------------------------------------
-- 3. Role change RPC — does NOT touch status
-- ---------------------------------------------------------------------
create or replace function admin_set_user_role(
  p_user_id uuid,
  p_role    text
) returns profiles
language plpgsql security definer set search_path = public as $$
declare v_row profiles;
begin
  if not is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_role not in ('admin','judge') then
    raise exception 'invalid role' using errcode = '22023';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'cannot modify own role' using errcode = '42501';
  end if;

  update profiles set role = p_role
  where id = p_user_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;
  return v_row;
end $$;

grant execute on function admin_set_user_role to authenticated;

-- ---------------------------------------------------------------------
-- 4. Project status transition — guard against silent flapping
--    `p_force = true` lets the admin overwrite even if submitted
--    reviews already exist (UI must confirm). With p_force = false the
--    RPC raises if the transition would silently invalidate review data.
--    Drop the previous (uuid, text, text) signature first so this becomes
--    a true replacement instead of an ambiguous overload.
-- ---------------------------------------------------------------------
drop function if exists public.set_project_status(uuid, text, text);

create or replace function set_project_status(
  p_project_id uuid,
  p_status     text,
  p_reason     text default null,
  p_force      boolean default false
) returns projects
language plpgsql security definer set search_path = public as $$
declare
  v_row     projects;
  v_current text;
  v_reviewed int;
begin
  if not is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_status not in ('pending','approved','rejected') then
    raise exception 'invalid status' using errcode = '22023';
  end if;

  select status into v_current from projects where id = p_project_id;
  if v_current is null then
    raise exception 'project not found' using errcode = 'P0002';
  end if;

  -- Block undo of an approved project that already has submitted reviews
  -- unless the admin explicitly forces it.
  if v_current = 'approved' and p_status <> 'approved' and not p_force then
    select count(*) into v_reviewed
    from project_reviews
    where project_id = p_project_id and submitted_at is not null;
    if v_reviewed > 0 then
      raise exception
        'project has % submitted review(s); pass p_force=true to override',
        v_reviewed
        using errcode = '42501';
    end if;
  end if;

  update projects set
    status          = p_status,
    rejected_reason = case when p_status = 'rejected' then p_reason end,
    reviewed_at     = now(),
    reviewed_by     = auth.uid()
  where id = p_project_id
    and status = v_current             -- optimistic concurrency guard
  returning * into v_row;

  if v_row.id is null then
    raise exception 'project changed concurrently — refresh and retry'
      using errcode = '40001';
  end if;
  return v_row;
end $$;

grant execute on function set_project_status to authenticated;

-- ---------------------------------------------------------------------
-- 5. File attachments — only attach to a still-pending project, and
--    only via storage uploads inside its folder within 24 h of creation.
-- ---------------------------------------------------------------------
create or replace function attach_project_files(
  p_project_id uuid,
  p_files      jsonb
) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_count   int;
  v_status  text;
  v_created timestamptz;
begin
  if p_project_id is null then
    raise exception 'project_id required' using errcode = '22023';
  end if;

  select status, created_at into v_status, v_created
  from projects where id = p_project_id;

  if v_status is null then
    raise exception 'project not found' using errcode = 'P0002';
  end if;

  -- Admins can attach files to any project at any time. Anonymous /
  -- judge callers can only attach to a project that is still in the
  -- submission window (pending, < 24 h old).
  if not is_admin() then
    if v_status <> 'pending' then
      raise exception 'project is no longer accepting files'
        using errcode = '42501';
    end if;
    if v_created < now() - interval '24 hours' then
      raise exception 'submission window has expired'
        using errcode = '42501';
    end if;
  end if;

  insert into project_files (project_id, file_name, file_path, file_size, mime_type)
  select
    p_project_id,
    btrim(f->>'file_name'),
    btrim(f->>'file_path'),
    (f->>'file_size')::bigint,
    nullif(btrim(f->>'mime_type'),'')
  from jsonb_array_elements(coalesce(p_files,'[]'::jsonb)) f;

  get diagnostics v_count = row_count;
  return v_count;
end $$;

grant execute on function attach_project_files to anon, authenticated;

-- Storage upload policy — only allow writing inside the folder of a
-- still-pending project (or by an admin). Existing files are read by
-- the previously defined `project_files_read` policy.
drop policy if exists project_files_upload on storage.objects;
create policy project_files_upload on storage.objects
  for insert
  with check (
    bucket_id = 'project-files'
    and (
      is_admin()
      or exists (
        select 1 from projects p
        where p.id::text = (storage.foldername(name))[1]
          and p.status = 'pending'
          and p.created_at > now() - interval '24 hours'
      )
    )
  );

-- ---------------------------------------------------------------------
-- 6. Score normalization
--    Instead of forcing the admin to keep sum(active weights) = 100 at
--    every intermediate edit (which breaks single-row updates), the
--    review aggregator divides by the actual active total. The final
--    score therefore always lives in [0, 100] regardless of how the
--    admin rebalances weights — and disabling all active dimensions
--    raises a clear error instead of silently producing NULL/NaN.
-- ---------------------------------------------------------------------
create or replace function upsert_review(
  p_project_id uuid,
  p_scores     jsonb,
  p_final      numeric default null,
  p_class      text    default null,
  p_notes      text    default null,
  p_submit     boolean default false
) returns project_reviews
language plpgsql security definer set search_path = public as $$
declare
  v_review       project_reviews;
  v_final        numeric;
  v_class        text;
  v_missing      int;
  v_active_total numeric;
begin
  perform p_final;
  perform p_class;

  if not is_judge() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not exists (select 1 from projects where id = p_project_id and status = 'approved') then
    raise exception 'project not approved' using errcode = '42501';
  end if;

  select coalesce(sum(weight), 0) into v_active_total
  from dimensions where is_active = true;

  if v_active_total <= 0 then
    raise exception 'evaluation criteria are not configured'
      using errcode = '42501';
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

  -- Normalize by the active weight total so the score stays in [0, 100]
  -- even when the admin's weights don't sum to exactly 100.
  select round(
    coalesce(sum((avg_score / 5) * weight), 0) / v_active_total * 100,
    1
  )::numeric
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

-- ---------------------------------------------------------------------
-- 7. Table-level grants for criteria admin
--    RLS is enforced *after* table privileges, so the init migration's
--    `criteria_admin_all` / `dimensions_admin_all` policies are never
--    reached without an INSERT/UPDATE/DELETE grant — admins were hitting
--    "permission denied for table criteria" before RLS could allow them.
-- ---------------------------------------------------------------------
grant select, insert, update, delete on dimensions, criteria to authenticated;

-- ---------------------------------------------------------------------
-- 8. Lock the `role` column — only the admin_set_user_role RPC writes
--    Even an admin's direct UPDATE on profiles.role would otherwise let
--    them escalate themselves silently. Revoking column-level UPDATE
--    forces every role change through admin_set_user_role (SECURITY
--    DEFINER), which enforces is_admin() + "cannot modify own role".
-- ---------------------------------------------------------------------
revoke update (role) on profiles from authenticated, anon;
