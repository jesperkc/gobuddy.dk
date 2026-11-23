-- First-party funnel events for measuring onboarding drop-off and time to value.
-- Write-only from the client: nobody can read rows through the API (service role /
-- SQL editor only). No IP, user agent or email is stored.
CREATE TABLE IF NOT EXISTS public.funnel_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Random per-browser-session id so pre-signup steps can be stitched together.
  session_id text,
  -- Set automatically for signed-in users; stays null before signup.
  user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  event text NOT NULL CHECK (char_length(event) BETWEEN 1 AND 64),
  props jsonb CHECK (props IS NULL OR pg_column_size(props) < 1024)
);

CREATE INDEX IF NOT EXISTS idx_funnel_events_event_created ON public.funnel_events (event, created_at);
CREATE INDEX IF NOT EXISTS idx_funnel_events_user_id ON public.funnel_events (user_id);

ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record a funnel event"
  ON public.funnel_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

REVOKE ALL ON public.funnel_events FROM anon, authenticated;
GRANT INSERT ON public.funnel_events TO anon, authenticated;
