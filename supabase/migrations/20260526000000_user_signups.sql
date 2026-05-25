-- =====================================================================
-- INNOPARK — public self-signup flow
-- =====================================================================
-- Adds optional profile fields collected at signup, switches the
-- auth-user trigger to default new accounts to status='pending', and
-- exposes a SECURITY DEFINER RPC so admins can approve / reject.
-- =====================================================================

set search_path = public;

alter table profiles
  add column if not exists phone      text,
  add column if not exists department text,
  add column if not exists bio        text;

-- Public self-signups default to pending; admin-created users (flagged
-- with created_by_admin=true in user_metadata) are pre-approved.
create or replace function handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_status text := case
    when coalesce(new.raw_user_meta_data->>'created_by_admin','') = 'true' then 'approved'
    else 'pending'
  end;
begin
  insert into profiles (id, full_name, role, status, phone, department, bio)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'judge',
    v_status,
    nullif(btrim(coalesce(new.raw_user_meta_data->>'phone','')),''),
    nullif(btrim(coalesce(new.raw_user_meta_data->>'department','')),''),
    nullif(btrim(coalesce(new.raw_user_meta_data->>'bio','')),'')
  )
  on conflict (id) do nothing;
  return new;
end $$;

-- Admin moderation of pending signups.
create or replace function set_user_status(
  p_user_id uuid,
  p_status  text
) returns profiles
language plpgsql security definer set search_path = public as $$
declare v_row profiles;
begin
  if not is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_status not in ('pending','approved','rejected') then
    raise exception 'invalid status' using errcode = '22023';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'cannot modify own status' using errcode = '42501';
  end if;

  update profiles set status = p_status
  where id = p_user_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;
  return v_row;
end $$;

grant execute on function set_user_status to authenticated;
