-- Hi5s table: tracks when one user hi5s another (one record per pair direction)
CREATE TABLE IF NOT EXISTS hi5s (
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (sender_id, receiver_id)
);

-- RLS
ALTER TABLE hi5s ENABLE ROW LEVEL SECURITY;

-- Users can read hi5s they sent or received
CREATE POLICY "Users can read own hi5s"
  ON hi5s FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can insert hi5s they send
CREATE POLICY "Users can insert own hi5s"
  ON hi5s FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Users can update hi5s they sent (for updated_at refresh)
CREATE POLICY "Users can update own hi5s"
  ON hi5s FOR UPDATE
  USING (auth.uid() = sender_id);
