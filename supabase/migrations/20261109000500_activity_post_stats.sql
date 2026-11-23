-- Structured activity stats. Until now the Strava import stored distance, time
-- and elevation as a text line in `description` ("12.4 km · 1:05 · ↑ 80 m"),
-- which can't be summed or sorted. Move them into numeric columns and let
-- `description` be free text for everyone.
--
-- Apply BEFORE deploying the app and the strava edge functions, which write and
-- select these columns.

alter table public.activity_posts
  add column if not exists distance_m double precision check (distance_m is null or distance_m >= 0),
  add column if not exists duration_s integer check (duration_s is null or duration_s >= 0),
  add column if not exists elevation_m double precision check (elevation_m is null or elevation_m >= 0);

-- Exact backfill from the raw Strava payload (no string parsing).
update public.activity_posts
set
  distance_m  = nullif((source_data ->> 'distance')::double precision, 0),
  duration_s  = nullif(round((source_data ->> 'moving_time')::numeric)::integer, 0),
  elevation_m = nullif((source_data ->> 'total_elevation_gain')::double precision, 0),
  -- The old stats line is now redundant; keep only Strava's own text, if any.
  description = nullif(btrim(source_data ->> 'description'), '')
where source = 'strava';
