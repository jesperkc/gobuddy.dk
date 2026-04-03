-- Simplify chat: replace conversations/participants/messages with a single flat messages table

-- Drop old tables (messages first due to FK)
drop table if exists public.messages;
drop table if exists public.conversation_participants;
drop table if exists public.conversations;

-- Simple messages table: sender → receiver
create table public.messages (
  id bigint generated always as identity primary key,
  sender_id uuid not null references public.profiles(profile_id),
  receiver_id uuid not null references public.profiles(profile_id),
  content text not null,
  created_at timestamptz default now() not null
);

-- RLS
alter table public.messages enable row level security;

create policy "Users can read their own messages"
  on public.messages for select using (
    sender_id = auth.uid() or receiver_id = auth.uid()
  );

create policy "Users can send messages"
  on public.messages for insert with check (
    sender_id = auth.uid()
  );

-- Indexes
create index idx_messages_sender on public.messages(sender_id);
create index idx_messages_receiver on public.messages(receiver_id);
create index idx_messages_created on public.messages(created_at desc);

-- Enable Realtime
alter publication supabase_realtime add table public.messages;
