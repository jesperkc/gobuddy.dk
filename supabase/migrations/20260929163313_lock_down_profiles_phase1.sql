-- Lock down profile data, phase 1 of 2.
--
-- Backward compatible with the currently deployed client. Fixes write access
-- (anyone — even anon — could update any profile; any signed-in user could
-- insert profiles/interests for others), hides who the admins are, and adds
-- what the phase-2 client needs: approximate coordinates for distance and
-- security-definer readers for the owner's/admin's full profile.

-- ---------------------------------------------------------------------------
-- Admin check. SECURITY DEFINER so policies on user_roles can call it without
-- recursing into their own RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- profiles: writes limited to the owner (or an admin).
drop policy if exists "Authenticated can update" on public.profiles;
create policy "Owner or admin can update profile" on public.profiles
  for update to authenticated
  using (profile_id = (select auth.uid()) or (select public.is_admin()))
  with check (profile_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "Authenticated can insert" on public.profiles;
create policy "Owner or admin can insert profile" on public.profiles
  for insert to authenticated
  with check (profile_id = (select auth.uid()) or (select public.is_admin()));

-- ---------------------------------------------------------------------------
-- user_interests: writes limited to the owner (or an admin).
drop policy if exists "Authenticated users can insert their interests" on public.user_interests;
create policy "Owner or admin can insert interests" on public.user_interests
  for insert to authenticated
  with check (profile_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "Authenticated users can update their interests" on public.user_interests;
create policy "Owner or admin can update interests" on public.user_interests
  for update to authenticated
  using (profile_id = (select auth.uid()) or (select public.is_admin()))
  with check (profile_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "Authenticated users can delete their interests" on public.user_interests;
create policy "Owner or admin can delete interests" on public.user_interests
  for delete to authenticated
  using (profile_id = (select auth.uid()) or (select public.is_admin()));

-- Redundant with the public read policy below it.
drop policy if exists "Authenticated users can select their interests" on public.user_interests;

-- ---------------------------------------------------------------------------
-- user_roles: you can see your own roles; admins can see everyone's.
drop policy if exists "select user_roles" on public.user_roles;
create policy "Own roles or admin" on public.user_roles
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Approximate position (~1 km grid) for showing distance to other users
-- without exposing where they live. coordinates is POINT(lat lng), matching
-- the existing latitude/longitude generated columns.
alter table public.profiles
  add column if not exists approx_latitude double precision
    generated always as (round(st_x(coordinates::geometry)::numeric, 2)::double precision) stored,
  add column if not exists approx_longitude double precision
    generated always as (round(st_y(coordinates::geometry)::numeric, 2)::double precision) stored;

-- ---------------------------------------------------------------------------
-- Full profile rows (email, exact position, address) for the owner or an
-- admin. Return the table type so PostgREST can embed relations on them.
create or replace function public.get_full_profile(p_id uuid)
returns setof public.profiles
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.profiles
  where profile_id = p_id
    and (p_id = (select auth.uid()) or (select public.is_admin()));
$$;

create or replace function public.admin_list_profiles()
returns setof public.profiles
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.profiles where (select public.is_admin());
$$;

revoke execute on function public.get_full_profile(uuid) from public, anon;
revoke execute on function public.admin_list_profiles() from public, anon;
grant execute on function public.get_full_profile(uuid) to authenticated;
grant execute on function public.admin_list_profiles() to authenticated;
