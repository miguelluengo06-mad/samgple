/**
 * Biblioteca de prompts: piezas que se combinan como un puzle.
 *  - Pieza (block): un trozo de prompt reutilizable (gancho, estilo, formato…). Puede llevar variables {{producto}}.
 *  - Receta (recipe): una lista ordenada de piezas guardada con nombre.
 */
export type PromptKind = 'block' | 'recipe';

export interface PromptRow {
  id: string;
  kind: PromptKind;
  title: string;
  body: string;
  category: string;
  block_ids: string[];
  tags: string[];
  favorite: boolean;
  created_at: string;
  updated_at: string;
}

const VAR_RE = /\{\{\s*([^{}\n]{1,40}?)\s*\}\}/g;

/** Variables únicas, en orden de aparición: «Hola {{nombre}}, {{producto}}…» → ['nombre', 'producto']. */
export function extractVariables(...texts: string[]): string[] {
  const seen = new Set<string>();
  for (const t of texts) {
    for (const m of t.matchAll(VAR_RE)) seen.add(m[1].trim());
  }
  return [...seen];
}

/** Une las piezas con una línea en blanco y rellena las variables; las que se dejan vacías se quedan como {{nombre}}. */
export function composePrompt(parts: string[], values: Record<string, string> = {}): string {
  return parts
    .map((p) => p.trim())
    .filter(Boolean)
    .join('\n\n')
    .replace(VAR_RE, (whole, name: string) => {
      const v = values[name.trim()];
      return v && v.trim() ? v.trim() : whole;
    });
}

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\u0000/g, '').trim().slice(0, max) : '');

export interface PromptInput {
  kind: PromptKind;
  title: string;
  body: string;
  category: string;
  block_ids: string[];
  tags: string[];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Etiquetas: acepta una lista o un texto separado por comas; minúsculas, sin repetir, máximo 12. */
export function sanitizeTags(input: unknown): string[] {
  const raw = Array.isArray(input) ? input : typeof input === 'string' ? input.split(',') : [];
  const out: string[] = [];
  for (const t of raw) {
    const tag = clean(t, 24).toLowerCase().replace(/^#/, '');
    if (tag && !out.includes(tag)) out.push(tag);
  }
  return out.slice(0, 12);
}

/** Valida lo que llega de la API; devuelve null si falta el título (o el texto de una pieza). */
export function sanitizePrompt(input: any): PromptInput | null {
  const kind: PromptKind = input?.kind === 'recipe' ? 'recipe' : 'block';
  const title = clean(input?.title, 120);
  const body = clean(input?.body, 8000);
  if (!title) return null;
  if (kind === 'block' && !body) return null;
  const ids = Array.isArray(input?.block_ids) ? input.block_ids.filter((x: unknown) => typeof x === 'string' && UUID_RE.test(x)).slice(0, 40) : [];
  if (kind === 'recipe' && ids.length === 0 && !body) return null;
  return { kind, title, body, category: clean(input?.category, 40), block_ids: ids, tags: sanitizeTags(input?.tags) };
}

export const CATEGORY_SUGGESTIONS = ['Guion', 'Gancho', 'Estilo', 'Voz', 'Formato', 'Producto', 'Llamada a la acción', 'Negativo'];

/** Piezas de partida para una agencia de vídeos con IA (el usuario las edita o borra). */
export const STARTER_PIECES: { title: string; category: string; body: string }[] = [
  { title: 'Contexto del anuncio', category: 'Producto', body: 'Crea un anuncio vertical de vídeo para {{producto}}, dirigido a {{público}}. Objetivo: {{objetivo}}.' },
  { title: 'Gancho · pregunta directa', category: 'Gancho', body: 'Abre con una pregunta que el espectador se haya hecho de verdad sobre {{problema}}, en los primeros 2 segundos.' },
  { title: 'Gancho · resultado primero', category: 'Gancho', body: 'Empieza mostrando el resultado final ya conseguido y luego explica cómo se llegó a él.' },
  { title: 'Estilo UGC realista', category: 'Estilo', body: 'Estilo UGC: cámara en mano, luz natural, persona real hablando a cámara, tono cercano y sin aspecto de anuncio.' },
  { title: 'Tono y voz', category: 'Voz', body: 'Habla en español de España, frases cortas, ritmo ágil, sin tecnicismos. Tono {{tono}}.' },
  { title: 'Estructura del guion (30 s)', category: 'Guion', body: 'Estructura: gancho (0–3 s) · problema (3–10 s) · solución con {{producto}} (10–22 s) · prueba o resultado (22–27 s) · llamada a la acción (27–30 s).' },
  { title: 'Formato vertical con subtítulos', category: 'Formato', body: 'Formato 9:16 vertical, subtítulos grandes y legibles en pantalla, pensado para verse sin sonido en TikTok, Reels y Shorts.' },
  { title: 'Llamada a la acción', category: 'Llamada a la acción', body: 'Cierra con una llamada a la acción clara: {{acción}}.' },
  { title: 'Evitar', category: 'Negativo', body: 'Evita: textos cortados, manos deformadas, logos inventados, promesas médicas o garantizadas, música con derechos de autor.' },
];

/** SQL para crear la tabla (el mismo que migrations/add-prompts.sql): el panel lo enseña si todavía no existe. */
export const PROMPTS_SETUP_SQL = `CREATE TABLE IF NOT EXISTS prompts (
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
`;
