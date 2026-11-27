-- Unsend a highfive like "Unsend" in Messenger: the 👋 message stays in the chat
-- but is marked unsent, so both people see "… har fortrudt en highfive".
-- Replaces the hard-delete policies from 20261127000000: unsending now only goes
-- through unsend_hi5(), and only the sender can unsend, only highfives.

drop policy if exists "Users can delete own highfive messages" on public.messages;
drop policy if exists "Users can delete own hi5s" on public.hi5s;

alter table public.messages add column if not exists unsent_at timestamptz;

create or replace function public.unsend_hi5(p_message_id bigint)
returns public.messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  msg public.messages;
begin
  update public.messages
     set unsent_at = now()
   where id = p_message_id
     and sender_id = (select auth.uid())
     and content = '👋'
     and unsent_at is null
  returning * into msg;

  if msg.id is null then
    raise exception 'No highfive to unsend' using errcode = 'P0002';
  end if;

  -- The hi5 record means "sent"; drop it once no highfive to this buddy is left.
  if not exists (
    select 1 from public.messages
     where sender_id = msg.sender_id
       and receiver_id = msg.receiver_id
       and content = '👋'
       and unsent_at is null
  ) then
    delete from public.hi5s where sender_id = msg.sender_id and receiver_id = msg.receiver_id;
  end if;

  return msg;
end;
$$;

revoke execute on function public.unsend_hi5(bigint) from public, anon;
grant execute on function public.unsend_hi5(bigint) to authenticated;
