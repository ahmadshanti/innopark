-- =====================================================================
-- INNOPARK — projects, judging, and admin workflow
-- =====================================================================
-- All writes from the public website go through SECURITY DEFINER RPCs so
-- the client can never set serial numbers, status, judge_id, etc.
-- Tables are locked down with RLS; only admins / judges with an approved
-- profile may read or write through the table API.
-- =====================================================================

set search_path = public;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- profiles  (exactly two roles: admin, judge; new users default to judge)
-- ---------------------------------------------------------------------
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  role        text not null default 'judge'
              check (role in ('admin','judge')),
  status      text not null default 'approved'
              check (status in ('pending','approved','rejected')),
  created_at  timestamptz not null default now()
);

create index if not exists profiles_role_created_idx
  on profiles(role, created_at desc);

create or replace function handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'judge',
    'approved'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();

-- Role helpers (used in policies). STABLE so the planner can inline them.
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin' and status = 'approved'
  );
$$;

create or replace function is_judge() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'judge' and status = 'approved'
  );
$$;

-- ---------------------------------------------------------------------
-- projects  (public applications, db-generated serial number)
-- ---------------------------------------------------------------------
create sequence if not exists project_number_seq start 1001;

create table if not exists projects (
  id              uuid primary key default gen_random_uuid(),
  project_number  int  not null unique default nextval('project_number_seq'),
  project_name    text not null check (length(btrim(project_name)) > 0),
  project_type    text not null check (project_type in ('individual','team')),
  applicant_name  text not null check (length(btrim(applicant_name)) > 0),
  mobile          text not null check (length(btrim(mobile)) >= 7),
  email           text not null
                  check (email ~* '^[^@[:space:]]+@(stu\.)?najah\.edu$'),
  department      text,
  description     text,
  status          text not null default 'pending'
                  check (status in ('pending','approved','rejected')),
  rejected_reason text,
  reviewed_at     timestamptz,
  reviewed_by     uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists projects_status_idx on projects(status);
create index if not exists projects_created_at_idx on projects(created_at desc);

create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists projects_touch on projects;
create trigger projects_touch
  before update on projects
  for each row execute function touch_updated_at();

-- ---------------------------------------------------------------------
-- project_members  (only meaningful for team projects)
-- ---------------------------------------------------------------------
create table if not exists project_members (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  full_name   text not null check (length(btrim(full_name)) > 0),
  email       text,
  role        text,
  position    int  not null default 0
);

create index if not exists project_members_project_idx on project_members(project_id);

-- ---------------------------------------------------------------------
-- dimensions + criteria  (admin-editable; seeded below)
-- ---------------------------------------------------------------------
create table if not exists dimensions (
  id        uuid primary key default gen_random_uuid(),
  key       text not null unique,
  name_ar   text not null,
  weight    numeric(5,2) not null check (weight > 0 and weight <= 100),
  position  int  not null default 0,
  is_active boolean not null default true
);

create table if not exists criteria (
  id            uuid primary key default gen_random_uuid(),
  dimension_id  uuid not null references dimensions(id) on delete cascade,
  name_ar       text not null,
  position      int  not null default 0,
  is_active     boolean not null default true,
  unique (dimension_id, name_ar)
);

create index if not exists criteria_dimension_idx on criteria(dimension_id);

-- ---------------------------------------------------------------------
-- project_reviews  (one judge × one project, enforced by UNIQUE)
-- ---------------------------------------------------------------------
create table if not exists project_reviews (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id) on delete cascade,
  judge_id        uuid not null references auth.users(id) on delete cascade,
  final_score     numeric(5,2),
  classification  text,
  notes           text,
  submitted_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (project_id, judge_id)
);

create index if not exists reviews_judge_idx on project_reviews(judge_id);
create index if not exists reviews_project_idx on project_reviews(project_id);
create index if not exists reviews_submitted_at_idx
  on project_reviews(submitted_at desc)
  where submitted_at is not null;
create index if not exists reviews_judge_submitted_at_idx
  on project_reviews(judge_id, submitted_at desc)
  where submitted_at is not null;

drop trigger if exists reviews_touch on project_reviews;
create trigger reviews_touch
  before update on project_reviews
  for each row execute function touch_updated_at();

create table if not exists project_review_scores (
  id            uuid primary key default gen_random_uuid(),
  review_id     uuid not null references project_reviews(id) on delete cascade,
  criterion_id  uuid not null references criteria(id) on delete restrict,
  score         int  not null check (score between 1 and 5),
  unique (review_id, criterion_id)
);

-- ---------------------------------------------------------------------
-- RPCs  (the only write surface for unauthenticated / judge clients)
-- ---------------------------------------------------------------------

-- Public submission. Bypasses RLS, validates inputs, and returns the
-- generated project_number so the website can show a confirmation.
create or replace function submit_project(
  p_project_name   text,
  p_project_type   text,
  p_applicant_name text,
  p_mobile         text,
  p_email          text,
  p_department     text default null,
  p_description    text default null,
  p_members        jsonb default '[]'::jsonb
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_project_id     uuid;
  v_project_number int;
begin
  if p_project_type not in ('individual','team') then
    raise exception 'project_type must be individual or team' using errcode = '22023';
  end if;

  insert into projects
    (project_name, project_type, applicant_name, mobile, email, department, description)
  values
    (btrim(p_project_name), p_project_type, btrim(p_applicant_name),
     btrim(p_mobile), lower(btrim(p_email)), nullif(btrim(p_department),''),
     nullif(btrim(p_description),''))
  returning id, project_number into v_project_id, v_project_number;

  if p_project_type = 'team' and jsonb_array_length(coalesce(p_members,'[]'::jsonb)) > 0 then
    insert into project_members (project_id, full_name, email, role, position)
    select v_project_id,
           btrim(m->>'full_name'),
           nullif(lower(btrim(m->>'email')),''),
           nullif(btrim(m->>'role'),''),
           coalesce((m->>'position')::int, ord)
    from jsonb_array_elements(p_members) with ordinality as t(m, ord);
  end if;

  return jsonb_build_object('id', v_project_id, 'project_number', v_project_number);
end $$;

-- Admin moderation.
create or replace function set_project_status(
  p_project_id uuid,
  p_status     text,
  p_reason     text default null
) returns projects
language plpgsql security definer set search_path = public as $$
declare v_row projects;
begin
  if not is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_status not in ('pending','approved','rejected') then
    raise exception 'invalid status' using errcode = '22023';
  end if;

  update projects set
    status          = p_status,
    rejected_reason = case when p_status = 'rejected' then p_reason end,
    reviewed_at     = now(),
    reviewed_by     = auth.uid()
  where id = p_project_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'project not found' using errcode = 'P0002';
  end if;
  return v_row;
end $$;

-- Judge upserts a review + its per-criterion scores in a single call.
-- Enforces project must be approved and that judge_id = auth.uid().
create or replace function upsert_review(
  p_project_id uuid,
  p_scores     jsonb,           -- [{criterion_id, score}]
  p_final      numeric default null,
  p_class      text    default null,
  p_notes      text    default null,
  p_submit     boolean default false
) returns project_reviews
language plpgsql security definer set search_path = public as $$
declare
  v_review project_reviews;
begin
  if not is_judge() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not exists (select 1 from projects where id = p_project_id and status = 'approved') then
    raise exception 'project not approved' using errcode = '42501';
  end if;

  insert into project_reviews (project_id, judge_id, final_score, classification, notes, submitted_at)
  values (p_project_id, auth.uid(), p_final, p_class, p_notes,
          case when p_submit then now() end)
  on conflict (project_id, judge_id) do update set
    final_score    = excluded.final_score,
    classification = excluded.classification,
    notes          = excluded.notes,
    submitted_at   = case when p_submit then now() else project_reviews.submitted_at end
  returning * into v_review;

  delete from project_review_scores where review_id = v_review.id;
  insert into project_review_scores (review_id, criterion_id, score)
  select v_review.id, (s->>'criterion_id')::uuid, (s->>'score')::int
  from jsonb_array_elements(coalesce(p_scores,'[]'::jsonb)) s;

  return v_review;
end $$;

grant execute on function submit_project to anon, authenticated;
grant execute on function set_project_status to authenticated;
grant execute on function upsert_review to authenticated;

-- ---------------------------------------------------------------------
-- View: judge_projects  (approved projects + did-I-review flag)
-- ---------------------------------------------------------------------
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
    where r.project_id = p.id
      and r.judge_id  = auth.uid()
      and r.submitted_at is not null
  ) as reviewed_by_me
from projects p
where p.status = 'approved';

grant select on judge_projects to authenticated;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table profiles              enable row level security;
alter table projects              enable row level security;
alter table project_members       enable row level security;
alter table dimensions            enable row level security;
alter table criteria              enable row level security;
alter table project_reviews       enable row level security;
alter table project_review_scores enable row level security;

-- profiles: self-read, admin-all
drop policy if exists profiles_self_read   on profiles;
drop policy if exists profiles_admin_all   on profiles;
create policy profiles_self_read on profiles
  for select using (id = auth.uid() or is_admin());
create policy profiles_admin_all on profiles
  for all using (is_admin()) with check (is_admin());

-- projects: only admin writes via table; judges read approved.
-- Public submission goes through submit_project() (security definer).
drop policy if exists projects_admin_all       on projects;
drop policy if exists projects_judge_read      on projects;
create policy projects_admin_all on projects
  for all using (is_admin()) with check (is_admin());
create policy projects_judge_read on projects
  for select using (is_judge() and status = 'approved');

-- project_members: same shape as projects
drop policy if exists project_members_admin_all  on project_members;
drop policy if exists project_members_judge_read on project_members;
create policy project_members_admin_all on project_members
  for all using (is_admin()) with check (is_admin());
create policy project_members_judge_read on project_members
  for select using (is_judge() and exists (
    select 1 from projects p where p.id = project_id and p.status = 'approved'
  ));

-- dimensions / criteria: world-readable, admin-writable
drop policy if exists dimensions_read       on dimensions;
drop policy if exists dimensions_admin_all  on dimensions;
create policy dimensions_read on dimensions for select using (true);
create policy dimensions_admin_all on dimensions for all using (is_admin()) with check (is_admin());

drop policy if exists criteria_read       on criteria;
drop policy if exists criteria_admin_all  on criteria;
create policy criteria_read on criteria for select using (true);
create policy criteria_admin_all on criteria for all using (is_admin()) with check (is_admin());

-- reviews: admin all; judge can read/write only own
drop policy if exists reviews_admin_all      on project_reviews;
drop policy if exists reviews_judge_select   on project_reviews;
drop policy if exists reviews_judge_insert   on project_reviews;
drop policy if exists reviews_judge_update   on project_reviews;
create policy reviews_admin_all on project_reviews
  for all using (is_admin()) with check (is_admin());
create policy reviews_judge_select on project_reviews
  for select using (is_judge() and judge_id = auth.uid());
create policy reviews_judge_insert on project_reviews
  for insert with check (
    is_judge()
    and judge_id = auth.uid()
    and exists (select 1 from projects p where p.id = project_id and p.status = 'approved')
  );
create policy reviews_judge_update on project_reviews
  for update using (is_judge() and judge_id = auth.uid())
            with check (is_judge() and judge_id = auth.uid());

-- review scores: piggy-back on parent review ownership
drop policy if exists scores_admin_all  on project_review_scores;
drop policy if exists scores_judge_rw   on project_review_scores;
create policy scores_admin_all on project_review_scores
  for all using (is_admin()) with check (is_admin());
create policy scores_judge_rw on project_review_scores
  for all using (exists (
    select 1 from project_reviews r
    where r.id = review_id and r.judge_id = auth.uid()
  )) with check (exists (
    select 1 from project_reviews r
    where r.id = review_id and r.judge_id = auth.uid()
  ));

-- ---------------------------------------------------------------------
-- Default revokes so anon can only call the explicit RPCs
-- ---------------------------------------------------------------------
revoke all on projects, project_members, project_reviews, project_review_scores
  from anon;
-- dimensions/criteria stay readable so the public application form
-- can render the criteria preview if desired.
grant select on dimensions, criteria to anon;

-- ---------------------------------------------------------------------
-- Seed default criteria (mirrors src/types/index.ts DIMENSIONS)
-- ---------------------------------------------------------------------
insert into dimensions (key, name_ar, weight, position) values
  ('technology',        'التقنية',                     25, 1),
  ('market',            'السوق',                       25, 2),
  ('businessModel',     'نموذج العمل',                 20, 3),
  ('teamCapabilities',  'قدرات الفريق',                20, 4),
  ('impact',            'الأثر والملاءمة الاستراتيجية', 10, 5)
on conflict (key) do update
  set name_ar = excluded.name_ar,
      weight  = excluded.weight,
      position= excluded.position;

with d as (select id, key from dimensions)
insert into criteria (dimension_id, name_ar, position)
select d.id, c.name_ar, c.position
from (values
  ('technology',       'وضوح الفكرة التقنية',            1),
  ('technology',       'مستوى الجاهزية التقنية TRL',     2),
  ('technology',       'إثبات الفكرة PoC',              3),
  ('technology',       'التعقيد التقني',                 4),
  ('technology',       'قابلية التنفيذ',                 5),
  ('market',           'وضوح المشكلة',                   1),
  ('market',           'فهم الزبون',                     2),
  ('market',           'حجم السوق',                      3),
  ('market',           'المنافسة',                       4),
  ('market',           'التحقق من السوق',                5),
  ('businessModel',    'نموذج الإيرادات',                1),
  ('businessModel',    'قابلية التوسع',                  2),
  ('businessModel',    'هيكل التكاليف',                  3),
  ('businessModel',    'القيمة المقترحة',                4),
  ('businessModel',    'النموذج التشغيلي',               5),
  ('teamCapabilities', 'الخبرة',                         1),
  ('teamCapabilities', 'تكامل الفريق',                   2),
  ('teamCapabilities', 'الالتزام',                       3),
  ('teamCapabilities', 'القدرة على التنفيذ',             4),
  ('teamCapabilities', 'القيادة',                        5),
  ('impact',           'الأثر المجتمعي',                 1),
  ('impact',           'الأثر الاقتصادي',                2),
  ('impact',           'الابتكار',                       3),
  ('impact',           'التوافق مع أولويات الجامعة',     4),
  ('impact',           'الاستدامة',                      5)
) as c(dim_key, name_ar, position)
join d on d.key = c.dim_key
on conflict (dimension_id, name_ar) do nothing;
