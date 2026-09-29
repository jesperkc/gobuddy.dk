-- Pin search_path on functions flagged by the Supabase linter (0011). Uses the
-- same schemas names already resolve through (PostGIS etc. live in
-- `extensions`), with pg_temp last so temp objects can't shadow anything.
-- Matters most for create_profile(), which runs as SECURITY DEFINER.
alter function public.create_profile() set search_path = public, extensions, pg_temp;
alter function public.delete_unused_custom_interests_delete() set search_path = public, extensions, pg_temp;
alter function public.generate_event_slug() set search_path = public, extensions, pg_temp;
alter function public.generate_profile_slug() set search_path = public, extensions, pg_temp;
alter function public.get_related_interests(uuid[], real) set search_path = public, extensions, pg_temp;
alter function public.set_interest_relations_updated_at() set search_path = public, extensions, pg_temp;
alter function public.update_activity_post_comments_updated_at() set search_path = public, extensions, pg_temp;
alter function public.update_activity_posts_updated_at() set search_path = public, extensions, pg_temp;
alter function public.update_strava_connections_updated_at() set search_path = public, extensions, pg_temp;
