-- Add is_non_interest flag to user_interests table
-- When true, the user has explicitly marked this interest as something they do NOT like.
alter table public.user_interests
  add column is_non_interest boolean not null default false;
