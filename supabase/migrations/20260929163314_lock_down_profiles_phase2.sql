-- Lock down profile data, phase 2 of 2.
--
-- APPLY ONLY AFTER the client that reads full profiles through
-- get_full_profile / admin_list_profiles and distance through
-- approx_latitude / approx_longitude is deployed. The old client selects
-- profiles.* and other users' exact coordinates, which this revokes.
--
-- Rows stay publicly readable (interest pages show who does what); columns
-- are limited per role. Owners and admins get the rest via the phase-1
-- security-definer functions.

revoke select on public.profiles from anon, authenticated;

-- Logged-out visitors: what the public interest pages show.
grant select (profile_id, slug, first_name, city) on public.profiles to anon;

-- Signed-in users: what buddy cards, profiles, chat and feeds show about
-- other people. No email, last name, street address or exact position.
grant select (
  profile_id, slug, first_name, city, country, country_code,
  age, bio, avatar_url, created_at,
  approx_latitude, approx_longitude
) on public.profiles to authenticated;
