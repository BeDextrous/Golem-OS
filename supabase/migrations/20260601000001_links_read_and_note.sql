-- Add read_at timestamp and note association to links
ALTER TABLE links
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS parent_note_id INT REFERENCES notes(id) ON DELETE SET NULL;
