ALTER TABLE client_tones
  ADD COLUMN IF NOT EXISTS average_tone_level numeric(5,2) NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS tone_sample_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS selected_tone_level smallint NOT NULL DEFAULT 25 CHECK (selected_tone_level BETWEEN 0 AND 100);

ALTER TABLE email_drafts
  ADD COLUMN IF NOT EXISTS tone_level smallint NOT NULL DEFAULT 25 CHECK (tone_level BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS preservation_warnings jsonb NOT NULL DEFAULT '[]'::jsonb;
