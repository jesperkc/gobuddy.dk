-- Reactions ("likes") and comments on activity_posts.

-- ── Likes ──────────────────────────────────────────────────────────
create table if not exists public.activity_post_likes (
  post_id uuid not null references public.activity_posts(id) on delete cascade,
  profile_id uuid not null references public.profiles(profile_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, profile_id)
);

create index if not exists idx_activity_post_likes_post_id on public.activity_post_likes(post_id);
create index if not exists idx_activity_post_likes_profile_id on public.activity_post_likes(profile_id);

alter table public.activity_post_likes enable row level security;

create policy "Anyone can view likes on visible posts"
  on public.activity_post_likes for select
  using (
    exists (
      select 1 from public.activity_posts p
      where p.id = post_id
        and (p.private = false or p.profile_id = auth.uid())
    )
  );

create policy "Users can like visible posts"
  on public.activity_post_likes for insert
  with check (
    auth.uid() = profile_id
    and exists (
      select 1 from public.activity_posts p
      where p.id = post_id
        and (p.private = false or p.profile_id = auth.uid())
    )
  );

create policy "Users can remove their own likes"
  on public.activity_post_likes for delete
  using (auth.uid() = profile_id);

create policy "Service role can manage all likes"
  on public.activity_post_likes for all
  using (auth.role() = 'service_role');

-- ── Comments ───────────────────────────────────────────────────────
create table if not exists public.activity_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.activity_posts(id) on delete cascade,
  profile_id uuid not null references public.profiles(profile_id) on delete cascade,
  body text not null check (length(trim(body)) > 0 and length(body) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_activity_post_comments_post_id on public.activity_post_comments(post_id, created_at);
create index if not exists idx_activity_post_comments_profile_id on public.activity_post_comments(profile_id);

alter table public.activity_post_comments enable row level security;

create policy "Anyone can view comments on visible posts"
  on public.activity_post_comments for select
  using (
    exists (
      select 1 from public.activity_posts p
      where p.id = post_id
        and (p.private = false or p.profile_id = auth.uid())
    )
  );

create policy "Users can comment on visible posts"
  on public.activity_post_comments for insert
  with check (
    auth.uid() = profile_id
    and exists (
      select 1 from public.activity_posts p
      where p.id = post_id
        and (p.private = false or p.profile_id = auth.uid())
    )
  );

create policy "Users can edit their own comments"
  on public.activity_post_comments for update
  using (auth.uid() = profile_id);

-- Comment authors can delete their own comments; post owners can also delete comments on their posts.
create policy "Users can delete own comments or comments on own posts"
  on public.activity_post_comments for delete
  using (
    auth.uid() = profile_id
    or exists (
      select 1 from public.activity_posts p
      where p.id = post_id and p.profile_id = auth.uid()
    )
  );

create policy "Service role can manage all comments"
  on public.activity_post_comments for all
  using (auth.role() = 'service_role');

-- updated_at trigger
create or replace function public.update_activity_post_comments_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_activity_post_comments_updated_at
  before update on public.activity_post_comments
  for each row
  execute function public.update_activity_post_comments_updated_at();
