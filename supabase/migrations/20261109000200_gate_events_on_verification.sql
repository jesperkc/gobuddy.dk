-- Unverified users can't join or create activities (same rule as messages/hi5s).
-- Creating an event auto-joins the creator, so both policies change together.
-- Leaving an event stays open to everyone.

drop policy if exists "Users can join events" on public.event_participants;
create policy "Verified users can join events"
  on public.event_participants for insert
  to authenticated
  with check (profile_id = (select auth.uid()) and (select public.is_email_verified()));

drop policy if exists "Users can create events" on public.events;
create policy "Verified users can create events"
  on public.events for insert
  to authenticated
  with check (creator_id = (select auth.uid()) and (select public.is_email_verified()));
