-- Events/Activities feature

-- Events table
create table public.events (
  event_id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(profile_id) on delete cascade,
  title text not null,
  description text,
  place_name text not null,
  latitude double precision not null,
  longitude double precision not null,
  date_type text not null default 'any'
    check (date_type in ('specific', 'any', 'weekday', 'weekend', 'weekdays_custom')),
  event_date date,
  event_weekdays smallint[],
  event_time time,
  time_of_day text[],
  max_participants integer,
  slug text not null default '',
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Slug generation for events (reuses Danish transliteration pattern)
create or replace function generate_event_slug()
returns trigger as $$
declare
  base_slug text;
  final_slug text;
  suffix text;
begin
  if NEW.slug is null or NEW.slug = '' then
    base_slug := lower(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(NEW.title, '[æÆ]', 'ae', 'g'),
            '[øØ]', 'oe', 'g'
          ),
          '[åÅ]', 'aa', 'g'
        ),
        '[^a-z0-9]+', '-', 'gi'
      )
    );
    base_slug := regexp_replace(base_slug, '^-+|-+$', '', 'g');
    base_slug := left(base_slug, 60);
    suffix := substr(md5(NEW.event_id::text), 1, 6);
    final_slug := base_slug || '-' || suffix;
    NEW.slug := final_slug;
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger events_auto_slug
  before insert or update on public.events
  for each row
  execute function generate_event_slug();

alter table public.events add constraint events_slug_unique unique (slug);

-- Event-Interest junction
create table public.event_interests (
  event_id uuid not null references public.events(event_id) on delete cascade,
  interest_id uuid not null references public.interests(interest_id) on delete cascade,
  primary key (event_id, interest_id)
);

-- Event participants (RSVPs)
create table public.event_participants (
  event_id uuid not null references public.events(event_id) on delete cascade,
  profile_id uuid not null references public.profiles(profile_id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (event_id, profile_id)
);

-- Indexes
create index idx_events_creator on public.events(creator_id);
create index idx_events_date on public.events(event_date);
create index idx_events_slug on public.events(slug);
create index idx_event_interests_interest on public.event_interests(interest_id);
create index idx_event_participants_profile on public.event_participants(profile_id);

-- RLS
alter table public.events enable row level security;
alter table public.event_interests enable row level security;
alter table public.event_participants enable row level security;

-- Events: readable by authenticated, writable by creator
create policy "Authenticated users can view events"
  on public.events for select using (auth.uid() is not null);

create policy "Users can create events"
  on public.events for insert with check (auth.uid() = creator_id);

create policy "Creators can update their events"
  on public.events for update using (auth.uid() = creator_id);

create policy "Creators can delete their events"
  on public.events for delete using (auth.uid() = creator_id);

-- Event interests: readable by authenticated, managed by event creator
create policy "Authenticated users can view event interests"
  on public.event_interests for select using (auth.uid() is not null);

create policy "Event creators can add event interests"
  on public.event_interests for insert with check (
    exists (
      select 1 from public.events
      where events.event_id = event_interests.event_id
      and events.creator_id = auth.uid()
    )
  );

create policy "Event creators can remove event interests"
  on public.event_interests for delete using (
    exists (
      select 1 from public.events
      where events.event_id = event_interests.event_id
      and events.creator_id = auth.uid()
    )
  );

-- Event participants: readable by authenticated, users manage own participation
create policy "Authenticated users can view participants"
  on public.event_participants for select using (auth.uid() is not null);

create policy "Users can join events"
  on public.event_participants for insert with check (auth.uid() = profile_id);

create policy "Users can leave events"
  on public.event_participants for delete using (auth.uid() = profile_id);
