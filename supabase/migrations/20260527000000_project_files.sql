-- =====================================================================
-- INNOPARK — project file attachments (PDF / Word / images / ZIP, ≤5MB)
-- =====================================================================
-- Files live in Supabase Storage bucket `project-files`, organized by
-- project id:  project-files/{project_id}/{filename}
-- This table only stores metadata + the storage path.
-- =====================================================================

set search_path = public;

-- ---------------------------------------------------------------------
-- 1. Storage bucket (private, 5 MB cap, restricted mime types)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-files',
  'project-files',
  false,
  5 * 1024 * 1024,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'application/zip',
    'application/x-zip-compressed',
    'application/octet-stream'
  ]
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------
-- 2. Storage RLS policies
--    - anon + authenticated can UPLOAD (so applicants without an account
--      can attach files to their submission)
--    - only admins / judges (approved) can READ
--    - only admins can DELETE
-- ---------------------------------------------------------------------
drop policy if exists project_files_upload on storage.objects;
drop policy if exists project_files_read   on storage.objects;
drop policy if exists project_files_delete on storage.objects;

create policy project_files_upload on storage.objects
  for insert
  with check (bucket_id = 'project-files');

create policy project_files_read on storage.objects
  for select
  using (bucket_id = 'project-files' and (is_admin() or is_judge()));

create policy project_files_delete on storage.objects
  for delete
  using (bucket_id = 'project-files' and is_admin());

-- ---------------------------------------------------------------------
-- 3. project_files table (metadata only)
-- ---------------------------------------------------------------------
create table if not exists project_files (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  file_name   text not null check (length(btrim(file_name)) > 0),
  file_path   text not null unique,           -- e.g. {project_id}/{name}
  file_size   bigint not null check (file_size > 0 and file_size <= 5 * 1024 * 1024),
  mime_type   text,
  created_at  timestamptz not null default now()
);

create index if not exists project_files_project_idx on project_files(project_id);

alter table project_files enable row level security;

drop policy if exists project_files_admin_all  on project_files;
drop policy if exists project_files_judge_read on project_files;

create policy project_files_admin_all on project_files
  for all using (is_admin()) with check (is_admin());

create policy project_files_judge_read on project_files
  for select using (is_judge() and exists (
    select 1 from projects p where p.id = project_id and p.status = 'approved'
  ));

revoke all on project_files from anon;

-- ---------------------------------------------------------------------
-- 4. RPC to register uploaded files against a project
--    The client uploads to Storage first (returns the path), then calls
--    this RPC to attach the metadata rows in one shot.
-- ---------------------------------------------------------------------
create or replace function attach_project_files(
  p_project_id uuid,
  p_files      jsonb           -- [{file_name, file_path, file_size, mime_type}]
) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  if p_project_id is null then
    raise exception 'project_id required' using errcode = '22023';
  end if;
  if not exists (select 1 from projects where id = p_project_id) then
    raise exception 'project not found' using errcode = 'P0002';
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
