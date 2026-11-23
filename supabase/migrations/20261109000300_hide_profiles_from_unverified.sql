-- Unverified users can only see their own profile row; everyone else's is
-- hidden until their email is verified. Logged-out visitors keep the public
-- view the interest pages rely on (column grants still limit what is exposed).
--
-- Replaces whatever SELECT policies profiles has today (names from the
-- original dashboard setup aren't tracked in migrations).

do $$
declare
  pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and cmd = 'SELECT'
  loop
    execute format('drop policy %I on public.profiles', pol.policyname);
  end loop;
end $$;

create policy "Public can read profiles"
  on public.profiles for select
  to anon
  using (true);

create policy "Own profile, verified users, or admins can read profiles"
  on public.profiles for select
  to authenticated
  using (
    profile_id = (select auth.uid())
    or (select public.is_email_verified())
    or (select public.is_admin())
  );
