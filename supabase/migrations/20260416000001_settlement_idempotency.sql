-- Add idempotency key to settlements for safe client retries
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS settlements_idempotency_key_idx ON settlements (idempotency_key) WHERE idempotency_key IS NOT NULL;
