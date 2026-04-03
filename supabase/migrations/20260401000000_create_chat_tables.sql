-- Conversations table
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  interest_id uuid references public.interests(interest_id) on delete set null,
  created_at timestamptz default now() not null
);

-- Conversation participants
create table if not exists public.conversation_participants (
  id bigint generated always as identity primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  profile_id uuid references public.profiles(profile_id) on delete cascade not null,
  joined_at timestamptz default now() not null,
  unique (conversation_id, profile_id)
);

-- Messages
create table if not exists public.messages (
  id bigint generated always as identity primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id uuid references public.profiles(profile_id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now() not null
);

-- Indexes
create index idx_messages_conversation on public.messages(conversation_id, created_at);
create index idx_participants_profile on public.conversation_participants(profile_id);
create index idx_participants_conversation on public.conversation_participants(conversation_id);

-- Enable RLS
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

-- RLS policies: users can only see conversations they participate in
create policy "Users can view their conversations"
  on public.conversations for select using (
    exists (
      select 1 from public.conversation_participants
      where conversation_id = conversations.id
      and profile_id = auth.uid()
    )
  );

create policy "Users can create conversations"
  on public.conversations for insert with check (true);

create policy "Users can view their participations"
  on public.conversation_participants for select using (
    auth.uid() is not null
  );

create policy "Users can join conversations"
  on public.conversation_participants for insert with check (true);

create policy "Users can view messages in their conversations"
  on public.messages for select using (
    exists (
      select 1 from public.conversation_participants
      where conversation_id = messages.conversation_id
      and profile_id = auth.uid()
    )
  );

create policy "Users can send messages to their conversations"
  on public.messages for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversation_participants
      where conversation_id = messages.conversation_id
      and profile_id = auth.uid()
    )
  );

-- Enable realtime for messages
alter publication supabase_realtime add table public.messages;
