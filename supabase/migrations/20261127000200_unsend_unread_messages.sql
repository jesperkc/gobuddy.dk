-- Unsend unread messages too, not only highfives.
--  * messages.read_at: set when the receiver has the chat open (mark_chat_read).
--  * unsend_message() replaces unsend_hi5(): the sender can unsend a highfive at
--    any time, and a text message while it is still unread. Proposals can't be
--    unsent (they are tied to an activity, which has its own cancel flow).
--  * An unsent text message is blanked, so the receiver can't fetch it any more.

alter table public.messages add column if not exists read_at timestamptz;

-- Mark everything this buddy sent me as read.
create or replace function public.mark_chat_read(p_buddy_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.messages
     set read_at = now()
   where sender_id = p_buddy_id
     and receiver_id = (select auth.uid())
     and read_at is null;
$$;

revoke execute on function public.mark_chat_read(uuid) from public, anon;
grant execute on function public.mark_chat_read(uuid) to authenticated;

create or replace function public.unsend_message(p_message_id bigint)
returns public.messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  msg public.messages;
begin
  update public.messages
     set unsent_at = now(),
         content = case when content = '👋' then content else '' end
   where id = p_message_id
     and sender_id = (select auth.uid())
     and unsent_at is null
     and (
       content = '👋'
       or (read_at is null and content !~ '(^|\n)/activities/[a-z0-9-]+\s*$')
     )
  returning * into msg;

  if msg.id is null then
    raise exception 'Message can not be unsent' using errcode = 'P0002';
  end if;

  -- The hi5 record means "sent"; drop it once no highfive to this buddy is left.
  if msg.content = '👋' and not exists (
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

revoke execute on function public.unsend_message(bigint) from public, anon;
grant execute on function public.unsend_message(bigint) to authenticated;

drop function if exists public.unsend_hi5(bigint);
