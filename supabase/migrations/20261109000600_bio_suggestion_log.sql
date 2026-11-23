-- Rate limiting for the AI bio suggestion edge function. One row per request;
-- written and read only by the function (service role). No client access.
create table if not exists public.bio_suggestion_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_bio_suggestion_log_user_created
  on public.bio_suggestion_log (user_id, created_at);

alter table public.bio_suggestion_log enable row level security;
revoke all on public.bio_suggestion_log from anon, authenticated;
