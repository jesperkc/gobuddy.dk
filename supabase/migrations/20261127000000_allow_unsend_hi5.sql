-- Let users unsend a highfive: the sender may delete their own 👋 messages and
-- their hi5 record. Other messages stay undeletable.

create policy "Users can delete own highfive messages"
  on public.messages for delete
  to authenticated
  using (sender_id = (select auth.uid()) and content = '👋');

create policy "Users can delete own hi5s"
  on public.hi5s for delete
  to authenticated
  using (sender_id = (select auth.uid()));
