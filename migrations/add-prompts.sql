-- Biblioteca de prompts del panel: piezas (blocks) y recetas (recipes = piezas ordenadas).
-- Idempotente: se puede ejecutar más de una vez. Pégalo en Supabase → SQL Editor → Run.

CREATE TABLE IF NOT EXISTS prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'block' CHECK (kind IN ('block', 'recipe')),
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  block_ids UUID[] NOT NULL DEFAULT '{}',
  tags TEXT[] NOT NULL DEFAULT '{}',
  favorite BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prompts_owner_kind ON prompts(owner_id, kind);

ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prompts' AND policyname = 'Service role full access prompts') THEN
    CREATE POLICY "Service role full access prompts" ON prompts FOR ALL TO service_role USING (true);
  END IF;
END $$;

-- Si ya habías creado la tabla antes de que existieran etiquetas y favoritas:
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS favorite BOOLEAN NOT NULL DEFAULT FALSE;

GRANT ALL ON prompts TO service_role;
