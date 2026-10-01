'use client';

import { useMemo, useState } from 'react';
import { BOOKING_TZ, addDays, callDayKey, todayInBookingTz } from '@/lib/booking';
import type { Lead } from '@/app/portal/leads/context';

const DAYS = 14;

const dayLabel = (key: string) =>
  new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
    .format(new Date(`${key}T12:00:00Z`))
    .replace(/\./g, '');

/** Requests + booked calls received per day over the last two weeks — one series, one hue. */
export default function ActivityChart({ leads }: { leads: Lead[] }) {
  const [active, setActive] = useState<number | null>(null);

  const { series, max, total } = useMemo(() => {
    const today = todayInBookingTz();
    const keys = Array.from({ length: DAYS }, (_, i) => addDays(today, i - (DAYS - 1)));
    const counts = new Map(keys.map((k) => [k, 0]));
    for (const l of leads) {
      const k = callDayKey(l.created_at);
      if (counts.has(k)) counts.set(k, (counts.get(k) || 0) + 1);
    }
    const series = keys.map((key) => ({ key, count: counts.get(key) || 0 }));
    return { series, max: Math.max(1, ...series.map((s) => s.count)), total: series.reduce((a, s) => a + s.count, 0) };
  }, [leads]);

  return (
    <div>
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-3xl font-semibold tracking-tight tabular-nums">{total}</span>
        <span className="text-sm text-white/40">en los últimos {DAYS} días</span>
      </div>

      <div className="relative flex items-end gap-1 h-32 border-b border-white/10" role="img" aria-label={`${total} entradas en los últimos ${DAYS} días`}>
        {series.map((s, i) => (
          <div
            key={s.key}
            tabIndex={0}
            className="relative flex-1 h-full flex items-end justify-center outline-none"
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
          >
            <span
              className={`block w-full max-w-[14px] rounded-t-[4px] transition-colors ${
                s.count === 0 ? 'h-[2px] bg-white/10' : active === i ? 'bg-[var(--signal)] shadow-[0_0_14px_var(--signal)]' : 'bg-gradient-to-t from-[var(--signal-dim)]/60 to-[var(--signal)]/90'
              }`}
              style={s.count > 0 ? { height: `${Math.max(8, (s.count / max) * 100)}%` } : undefined}
            />
            {active === i && (
              <span
                className={`absolute bottom-full mb-2 z-10 whitespace-nowrap rounded-lg border border-white/10 bg-black/90 px-2.5 py-1.5 text-xs pointer-events-none ${
                  i < 3 ? 'left-0' : i > DAYS - 4 ? 'right-0' : 'left-1/2 -translate-x-1/2'
                }`}
              >
                <span className="text-white/50 capitalize">{dayLabel(s.key)}</span>
                <span className="ml-2 font-semibold text-white">{s.count}</span>
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2 text-[11px] text-white/30 capitalize">
        <span>{dayLabel(series[0].key)}</span>
        <span>Hoy</span>
      </div>

      {/* Table view for screen readers */}
      <table className="sr-only">
        <caption>Entradas por día ({BOOKING_TZ})</caption>
        <tbody>
          {series.map((s) => (
            <tr key={s.key}>
              <th scope="row">{dayLabel(s.key)}</th>
              <td>{s.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
