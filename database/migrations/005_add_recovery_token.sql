ALTER TABLE users ADD COLUMN recovery_token TEXT;
ALTER TABLE users ADD COLUMN recovery_token_expires_at TIMESTAMPTZ;
