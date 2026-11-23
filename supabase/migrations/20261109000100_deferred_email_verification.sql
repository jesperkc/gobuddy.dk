-- Deferred email verification.
--
-- New users get a session at signup (dashboard: Authentication -> Providers ->
-- Email -> "Confirm email" OFF) and can fill in their profile straight away.
-- Because Supabase then marks every email as confirmed, we track real
-- verification ourselves. Unverified users cannot send messages or hi5s.
--
-- APPLY THIS BEFORE turning "Confirm email" off, so existing confirmed users
-- are backfilled as verified.

create table if not exists public.email_verifications (
  user_id uuid primary key references auth.users(id) on delete cascade,
  verified_at timestamptz not null default now()
);

alter table public.email_verifications enable row level security;

-- Users can see their own status. No insert/update/delete policies: rows are
-- only written by mark_email_verified() below.
create policy "Read own verification"
  on public.email_verifications for select
  to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.email_verifications from anon, authenticated;
grant select on public.email_verifications to authenticated;

-- Everyone who already confirmed their email through the old flow.
insert into public.email_verifications (user_id, verified_at)
select id, email_confirmed_at from auth.users where email_confirmed_at is not null
on conflict (user_id) do nothing;

-- Records verification for the caller, but only if their current session was
-- obtained by proving control of the email (one-time code or link) in the last
-- 10 minutes. The check reads the session's authentication methods (amr claim),
-- which the client cannot forge.
create or replace function public.mark_email_verified()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  proven boolean;
  ts timestamptz;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select exists (
    select 1
    from jsonb_array_elements(coalesce((select auth.jwt()) -> 'amr', '[]'::jsonb)) as a
    where a ->> 'method' in ('otp', 'email/signup', 'magiclink')
      and to_timestamp((a ->> 'timestamp')::double precision) > now() - interval '10 minutes'
  ) into proven;

  if not proven then
    raise exception 'email not verified in this session' using errcode = '42501';
  end if;

  insert into public.email_verifications (user_id) values (uid)
  on conflict (user_id) do update set user_id = excluded.user_id
  returning verified_at into ts;

  return ts;
end;
$$;

revoke execute on function public.mark_email_verified() from public, anon;
grant execute on function public.mark_email_verified() to authenticated;

-- Server-side gate: only verified users can send messages and hi5s.
create or replace function public.is_email_verified()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.email_verifications where user_id = (select auth.uid()));
$$;

revoke execute on function public.is_email_verified() from public, anon;
grant execute on function public.is_email_verified() to authenticated;

drop policy if exists "Users can send messages" on public.messages;
create policy "Verified users can send messages"
  on public.messages for insert
  to authenticated
  with check (sender_id = (select auth.uid()) and (select public.is_email_verified()));

drop policy if exists "Users can insert own hi5s" on public.hi5s;
create policy "Verified users can insert own hi5s"
  on public.hi5s for insert
  to authenticated
  with check (sender_id = (select auth.uid()) and (select public.is_email_verified()));

drop policy if exists "Users can update own hi5s" on public.hi5s;
create policy "Verified users can update own hi5s"
  on public.hi5s for update
  to authenticated
  using (sender_id = (select auth.uid()) and (select public.is_email_verified()));
