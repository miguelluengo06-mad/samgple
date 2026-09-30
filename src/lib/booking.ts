/**
 * Call booking rules shared by the public booking form and the API.
 * Slots are wall-clock times in BOOKING_TZ so they stay correct across DST.
 */

export const BOOKING_TZ = 'Europe/Madrid';
export const SLOT_TIMES = ['10:00', '11:00', '12:00', '13:00', '16:00', '17:00', '18:00'];
export const MIN_LEAD_HOURS = 3;
export const BOOKING_DAYS_AHEAD = 21;
export const CALL_DURATION_MIN = 30;

export const NEED_OPTIONS = ['Vídeo', 'Redes sociales', 'Estrategia', 'Copy', 'Fotografía', 'Aún no lo sé'];
export const BUDGET_OPTIONS = ['Menos de 1.000 €/mes', '1.000 – 3.000 €/mes', '3.000 – 7.000 €/mes', 'Más de 7.000 €/mes', 'Sin definir'];
export const TIMELINE_OPTIONS = ['Lo antes posible', 'En 1–3 meses', 'Solo estoy explorando'];

export interface CallAnswers {
  needs: string[];
  budget: string;
  timeline: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

function tzOffsetMinutes(utcMs: number, tz: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(new Date(utcMs))
      .map((p) => [p.type, p.value])
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return (asUtc - utcMs) / 60000;
}

/** Convert a wall-clock date ("2026-10-01") + time ("10:00") in BOOKING_TZ to the real UTC instant. */
export function zonedTimeToUtc(date: string, time: string, tz: string = BOOKING_TZ): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const off = tzOffsetMinutes(guess, tz);
  let utc = guess - off * 60000;
  // Around a DST change the first offset can be off by an hour — re-check once.
  const off2 = tzOffsetMinutes(utc, tz);
  if (off2 !== off) utc = guess - off2 * 60000;
  return new Date(utc);
}

/** Today's date in BOOKING_TZ as YYYY-MM-DD. */
export function todayInBookingTz(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BOOKING_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday, for a calendar date string. */
export function dayOfWeek(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function isWeekday(date: string): boolean {
  const dow = dayOfWeek(date);
  return dow >= 1 && dow <= 5;
}

/** Upcoming bookable dates (Mon–Fri) in BOOKING_TZ, starting today. */
export function getBookableDays(now: Date = new Date(), daysAhead: number = BOOKING_DAYS_AHEAD): string[] {
  const start = todayInBookingTz(now);
  const days: string[] = [];
  for (let i = 0; i <= daysAhead; i++) {
    const d = addDays(start, i);
    if (isWeekday(d) && getSlotsForDay(d, now).length > 0) days.push(d);
  }
  return days;
}

/** Slot times still reachable for a date (respects the minimum lead time). */
export function getSlotsForDay(date: string, now: Date = new Date()): string[] {
  if (!DATE_RE.test(date) || !isWeekday(date)) return [];
  const earliest = now.getTime() + MIN_LEAD_HOURS * 3600 * 1000;
  return SLOT_TIMES.filter((t) => zonedTimeToUtc(date, t).getTime() >= earliest);
}

// Not a discriminated union on purpose: this project doesn't run with strictNullChecks, where that can't narrow.
export interface SlotCheck {
  ok: boolean;
  at?: Date;
  error?: string;
}

/** Full server-side validation of a requested slot. */
export function validateSlot(date: unknown, time: unknown, now: Date = new Date()): SlotCheck {
  if (typeof date !== 'string' || typeof time !== 'string' || !DATE_RE.test(date) || !TIME_RE.test(time)) {
    return { ok: false, error: 'Elige un día y una hora válidos' };
  }
  if (Number.isNaN(Date.parse(`${date}T00:00:00Z`)) || !SLOT_TIMES.includes(time)) {
    return { ok: false, error: 'Elige un día y una hora válidos' };
  }
  const today = todayInBookingTz(now);
  if (date > addDays(today, BOOKING_DAYS_AHEAD)) {
    return { ok: false, error: 'Ese día aún no está disponible' };
  }
  if (!getSlotsForDay(date, now).includes(time)) {
    return { ok: false, error: 'Esa franja ya no está disponible' };
  }
  return { ok: true, at: zonedTimeToUtc(date, time) };
}

const pad = (n: number) => String(n).padStart(2, '0');

function icsStamp(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
}

const icsEscape = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Minimal iCalendar file so people can add the call to their calendar. */
export function buildIcs(opts: { uid: string; start: Date; title: string; description?: string }): string {
  const end = new Date(opts.start.getTime() + CALL_DURATION_MIN * 60000);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Agenda//Llamadas//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${opts.uid}`,
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(opts.start)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:${icsEscape(opts.title)}`,
    opts.description ? `DESCRIPTION:${icsEscape(opts.description)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
}

/** "viernes, 25 de septiembre" → "Viernes, 25 de septiembre" */
export function formatCallDate(iso: string | Date, opts: { withYear?: boolean } = {}): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const text = new Intl.DateTimeFormat('es-ES', {
    timeZone: BOOKING_TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(opts.withYear ? { year: 'numeric' } : {}),
  }).format(d);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatCallTime(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return new Intl.DateTimeFormat('es-ES', { timeZone: BOOKING_TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);
}

/** Calendar day of an instant in BOOKING_TZ (YYYY-MM-DD) — for grouping calls by day. */
export function callDayKey(iso: string | Date): string {
  return todayInBookingTz(typeof iso === 'string' ? new Date(iso) : iso);
}

/** Only accept answers that match the offered options, so the stored JSON stays clean. */
export function sanitizeAnswers(input: any): CallAnswers {
  const needs = Array.isArray(input?.needs) ? input.needs.filter((n: unknown) => typeof n === 'string' && NEED_OPTIONS.includes(n)) : [];
  const budget = typeof input?.budget === 'string' && BUDGET_OPTIONS.includes(input.budget) ? input.budget : '';
  const timeline = typeof input?.timeline === 'string' && TIMELINE_OPTIONS.includes(input.timeline) ? input.timeline : '';
  return { needs: Array.from(new Set<string>(needs)), budget, timeline };
}
