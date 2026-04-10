-- Activity posts: vendor-agnostic activity/post entries
-- Supports imports from Strava (and future vendors) as well as manual creation.

create table if not exists public.activity_posts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(profile_id) on delete cascade,
  interest_id uuid references public.interests(interest_id) on delete set null,
  title text not null,
  description text,
  source text not null default 'manual',      -- 'strava' | 'manual' | future vendors
  source_id text,                              -- vendor's activity ID for dedup
  source_url text,                             -- link back to vendor (e.g. Strava activity)
  source_data jsonb default '{}'::jsonb,       -- raw vendor payload
  activity_date timestamptz,                   -- when the activity happened
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint uq_activity_posts_source unique (source, source_id)
);

-- Indexes
create index if not exists idx_activity_posts_profile_id on public.activity_posts(profile_id);
create index if not exists idx_activity_posts_created_at on public.activity_posts(created_at desc);
create index if not exists idx_activity_posts_source on public.activity_posts(source);

-- RLS
alter table public.activity_posts enable row level security;

create policy "Anyone can view activity posts"
  on public.activity_posts for select
  using (true);

create policy "Users can insert their own activity posts"
  on public.activity_posts for insert
  with check (auth.uid() = profile_id);

create policy "Users can update their own activity posts"
  on public.activity_posts for update
  using (auth.uid() = profile_id);

create policy "Users can delete their own activity posts"
  on public.activity_posts for delete
  using (auth.uid() = profile_id);

-- Service role bypass for webhook/import (server-side with service role key)
create policy "Service role can manage all activity posts"
  on public.activity_posts for all
  using (auth.role() = 'service_role');

-- Auto-update updated_at
create or replace function public.update_activity_posts_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_activity_posts_updated_at
  before update on public.activity_posts
  for each row
  execute function public.update_activity_posts_updated_at();

-- Activity post media (images/videos)
create table if not exists public.activity_post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.activity_posts(id) on delete cascade,
  url text not null,
  media_type text not null default 'image',    -- 'image' | 'video'
  source text not null default 'upload',       -- 'strava' | 'upload'
  sort_order int default 0,
  created_at timestamptz default now()
);

create index if not exists idx_activity_post_media_post_id on public.activity_post_media(post_id);

-- RLS
alter table public.activity_post_media enable row level security;

create policy "Anyone can view activity post media"
  on public.activity_post_media for select
  using (true);

create policy "Post owners can insert media"
  on public.activity_post_media for insert
  with check (
    exists (
      select 1 from public.activity_posts
      where id = post_id and profile_id = auth.uid()
    )
  );

create policy "Post owners can delete media"
  on public.activity_post_media for delete
  using (
    exists (
      select 1 from public.activity_posts
      where id = post_id and profile_id = auth.uid()
    )
  );

create policy "Service role can manage all activity post media"
  on public.activity_post_media for all
  using (auth.role() = 'service_role');
