import { randomUUID } from 'crypto';

/**
 * Avisos de la agencia al cliente: se guardan dentro de la solicitud (leads.answers.notices) y el cliente
 * los ve en su cuenta (Mi cuenta → Avisos) si tiene cuenta con el mismo email confirmado. Sin tablas nuevas.
 */
export interface Notice {
  id: string;
  title: string;
  body: string;
  created_at: string;
  read_at?: string | null;
}

export const MAX_NOTICES = 50;

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\u0000/g, '').trim().slice(0, max) : '');

export function parseNotices(answers: unknown): Notice[] {
  const raw = (answers as { notices?: unknown } | null)?.notices;
  return Array.isArray(raw) ? (raw.filter((n) => n && typeof n === 'object' && typeof (n as Notice).id === 'string') as Notice[]) : [];
}

/** Devuelve las respuestas con el aviso añadido, o null si el título o el texto están vacíos. */
export function addNotice(answers: Record<string, unknown> | null, input: { title: unknown; body: unknown }, now: Date = new Date()): { answers: Record<string, unknown>; notice: Notice } | null {
  const title = clean(input.title, 120);
  const body = clean(input.body, 2000);
  if (!title || !body) return null;
  const notice: Notice = { id: randomUUID(), title, body, created_at: now.toISOString(), read_at: null };
  const notices = [notice, ...parseNotices(answers)].slice(0, MAX_NOTICES);
  return { answers: { ...(answers || {}), notices }, notice };
}

/** Marca un aviso como leído (no cambia nada si no existe o ya estaba leído). */
export function markNoticeRead(answers: Record<string, unknown> | null, noticeId: string, now: Date = new Date()): Record<string, unknown> | null {
  const notices = parseNotices(answers);
  if (!notices.some((n) => n.id === noticeId && !n.read_at)) return null;
  return { ...(answers || {}), notices: notices.map((n) => (n.id === noticeId ? { ...n, read_at: now.toISOString() } : n)) };
}
