-- Add `private` flag to activity_posts so Strava (and manual) posts can be
-- hidden from public feeds while still being owned/visible to their author.

alter table public.activity_posts
  add column if not exists private boolean not null default false;

create index if not exists idx_activity_posts_private on public.activity_posts(private);

-- Backfill existing Strava posts using the visibility stored in source_data.
-- Anything not explicitly "everyone" is treated as private.
update public.activity_posts
set private = true
where source = 'strava'
  and coalesce(source_data->>'visibility', '') <> 'everyone';

-- Replace the open select policy with one that hides private posts from
-- everyone except the owner. The existing service-role policy continues
-- to allow webhook/import code full access.
drop policy if exists "Anyone can view activity posts" on public.activity_posts;

create policy "Anyone can view non-private activity posts"
  on public.activity_posts for select
  using (private = false or auth.uid() = profile_id);
