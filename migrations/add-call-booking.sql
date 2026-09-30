-- Call booking on leads: a lead can now be a scheduled call (kind = 'call')
-- with a date/time, a phone number and answers to the pre-call questions.
-- Additive and idempotent — safe to run more than once. Existing rows keep
-- working as plain proposal requests (kind = 'proposal').

ALTER TABLE leads ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'proposal';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS call_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS answers JSONB;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_kind_check') THEN
    ALTER TABLE leads ADD CONSTRAINT leads_kind_check CHECK (kind IN ('proposal', 'call'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_leads_call_at ON leads(call_at) WHERE call_at IS NOT NULL;

-- One active call per time slot. Cancelled calls (status = 'lost') free the slot.
CREATE UNIQUE INDEX IF NOT EXISTS uq_leads_call_slot
  ON leads(owner_id, call_at)
  WHERE kind = 'call' AND call_at IS NOT NULL AND status <> 'lost';
