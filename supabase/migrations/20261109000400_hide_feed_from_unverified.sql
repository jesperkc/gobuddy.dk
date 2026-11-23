-- Unverified users can't see the feed or post to it. They still see their own
-- posts (profile page). Likes and comments only check "is the post visible to
-- me", so they follow automatically; media is tightened below because its
-- policy didn't look at the post at all.

drop policy if exists "Anyone can view non-private activity posts" on public.activity_posts;
drop policy if exists "Anyone can view activity posts" on public.activity_posts;

create policy "Public can view non-private activity posts"
  on public.activity_posts for select
  to anon
  using (private = false);

create policy "Own posts, or non-private posts for verified users"
  on public.activity_posts for select
  to authenticated
  using (
    profile_id = (select auth.uid())
    or (private = false and (select public.is_email_verified()))
  );

drop policy if exists "Users can insert their own activity posts" on public.activity_posts;
create policy "Verified users can insert their own activity posts"
  on public.activity_posts for insert
  to authenticated
  with check (profile_id = (select auth.uid()) and (select public.is_email_verified()));

-- Media is visible exactly when its post is (the subquery is filtered by the
-- policies above).
drop policy if exists "Anyone can view activity post media" on public.activity_post_media;
create policy "Media follows post visibility"
  on public.activity_post_media for select
  using (exists (select 1 from public.activity_posts p where p.id = post_id));
