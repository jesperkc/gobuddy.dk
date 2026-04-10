-- Strava OAuth connections
-- Stores access/refresh tokens and athlete metadata for each user
create table if not exists public.strava_connections (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(profile_id) on delete cascade,
  strava_athlete_id bigint not null,
  access_token text not null,
  refresh_token text not null,
  token_expires_at timestamptz not null,
  athlete_data jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for fast lookup by profile
create index if not exists idx_strava_connections_profile_id on public.strava_connections(profile_id);

-- RLS: users can only access their own connection
alter table public.strava_connections enable row level security;

create policy "Users can view their own strava connection"
  on public.strava_connections for select
  using (auth.uid() = profile_id);

create policy "Users can insert their own strava connection"
  on public.strava_connections for insert
  with check (auth.uid() = profile_id);

create policy "Users can update their own strava connection"
  on public.strava_connections for update
  using (auth.uid() = profile_id);

create policy "Users can delete their own strava connection"
  on public.strava_connections for delete
  using (auth.uid() = profile_id);

-- Auto-update updated_at on changes
create or replace function public.update_strava_connections_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_strava_connections_updated_at
  before update on public.strava_connections
  for each row
  execute function public.update_strava_connections_updated_at();
