'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, CalendarPlus, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import {
  BOOKING_TZ,
  BUDGET_OPTIONS,
  NEED_OPTIONS,
  TIMELINE_OPTIONS,
  buildIcs,
  formatCallDate,
  formatCallTime,
  getBookableDays,
  getSlotsForDay,
  zonedTimeToUtc,
} from '@/lib/booking';

interface Slot {
  time: string;
  available: boolean;
}

const inputClass =
  'w-full bg-transparent border-b border-white/20 focus:border-[var(--signal)] outline-none py-3 text-lg transition-colors placeholder:text-white/25';
const labelClass = 'block text-xs uppercase tracking-widest text-white/40 mb-2';

const dayParts = (date: string) => {
  const d = new Date(`${date}T12:00:00Z`);
  return {
    weekday: new Intl.DateTimeFormat('es-ES', { weekday: 'short', timeZone: 'UTC' }).format(d).replace('.', ''),
    day: d.getUTCDate(),
    month: new Intl.DateTimeFormat('es-ES', { month: 'short', timeZone: 'UTC' }).format(d).replace('.', ''),
  };
};

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`px-4 py-2 rounded-full border text-sm transition-colors ${
        selected
          ? 'bg-[var(--signal)] border-[var(--signal)] text-black font-medium'
          : 'border-white/15 text-white/70 hover:border-white/40 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Two-step call booking: pick a slot, then answer a few short questions.
 * Rendered inline in the page and inside the modal opened by every "Agendar llamada" button.
 */
export default function BookCallForm({
  businessName,
  pack,
  onClose,
}: {
  businessName: string;
  /** Pack the visitor clicked ("UGC · Pro"…). Saved with the lead so the agency knows what they want. */
  pack?: string;
  onClose?: () => void;
}) {
  // Inline form and modal can be on the page at the same time — ids must not collide
  const uid = useId();
  const [step, setStep] = useState<1 | 2>(1);
  const [days, setDays] = useState<string[]>([]);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsVersion, setSlotsVersion] = useState(0);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [needs, setNeeds] = useState<string[]>([]);
  const [budget, setBudget] = useState('');
  const [timeline, setTimeline] = useState('');
  const [message, setMessage] = useState('');

  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  // Dates depend on the visitor's clock — compute after mount so SSR and hydration agree.
  useEffect(() => {
    const list = getBookableDays();
    setDays(list);
    if (list.length > 0) setDate(list[0]);
  }, []);

  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    setSlotsLoading(true);
    setTime(null);
    fetch(`/api/public/availability?date=${date}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('availability'))))
      .then((data) => { if (!cancelled) setSlots(data.slots || []); })
      .catch(() => {
        // Availability is a convenience — fall back to the local rules; the server re-checks on submit.
        if (!cancelled) {
          const open = getSlotsForDay(date);
          setSlots(open.map((t) => ({ time: t, available: true })));
        }
      })
      .finally(() => { if (!cancelled) setSlotsLoading(false); });
    return () => { cancelled = true; };
  }, [date, slotsVersion]);

  const callAt = useMemo(() => (date && time ? zonedTimeToUtc(date, time) : null), [date, time]);
  const toggleNeed = (n: string) => setNeeds((cur) => (cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n]));

  const goToStep = (s: 1 | 2) => {
    setStep(s);
    setError(null);
    topRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time) return goToStep(1);
    setStatus('sending');
    setError(null);
    try {
      const res = await fetch('/api/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'call',
          name, email, phone, company,
          message: pack ? `Pack de interés: ${pack}${message.trim() ? `\n${message.trim()}` : ''}` : message,
          date, time,
          answers: { needs, budget, timeline },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 409) {
          // Slot was taken meanwhile: back to the picker with fresh availability.
          setSlotsVersion((v) => v + 1);
          setStatus('idle');
          setStep(1);
          setError(data.error || 'Esa franja acaba de reservarse. Elige otra.');
          return;
        }
        throw new Error(data.error || 'No se pudo agendar la llamada');
      }
      setBookingId(data.id || null);
      setStatus('sent');
    } catch (err: any) {
      setError(err.message || 'No se pudo agendar la llamada');
      setStatus('idle');
    }
  };

  const downloadIcs = () => {
    if (!callAt) return;
    const ics = buildIcs({
      uid: `${bookingId || callAt.getTime()}@llamada`,
      start: callAt,
      title: `Llamada con ${businessName}`,
      description: `Llamada de 30 min con ${businessName}. Horario de Madrid.`,
    });
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'llamada.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (status === 'sent' && callAt) {
    return (
      <div className="flex flex-col items-center text-center py-10 md:py-14" role="status">
        <CheckCircle2 className="w-10 h-10 text-[var(--signal)] mb-4" />
        <h3 className="font-kinetic text-2xl uppercase mb-3">Llamada agendada</h3>
        <p className="text-white/70 max-w-sm mb-1">{formatCallDate(callAt)}</p>
        <p className="font-kinetic text-3xl text-[var(--signal)] mb-4">{formatCallTime(callAt)}</p>
        <p className="text-white/50 max-w-sm text-sm mb-8">
          Gracias, {name.split(' ')[0]}. Te llamaremos al {phone}. Guarda el evento en tu calendario para no olvidarlo.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={downloadIcs}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/15 hover:border-[var(--signal)] text-sm transition-colors"
          >
            <CalendarPlus className="w-4 h-4" /> Añadir a mi calendario
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full bg-[var(--signal)] text-black text-sm font-medium hover:bg-[var(--signal-dim)] transition-colors"
            >
              Cerrar
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={topRef}>
      {/* Progress */}
      <div className="flex items-center gap-3 mb-8" aria-label={`Paso ${step} de 2`}>
        {[1, 2].map((n) => (
          <div key={n} className="flex items-center gap-3 flex-1 last:flex-none">
            <span
              className={`w-7 h-7 rounded-full text-xs font-medium flex items-center justify-center border transition-colors ${
                step >= n ? 'bg-[var(--signal)] border-[var(--signal)] text-black' : 'border-white/20 text-white/40'
              }`}
            >
              {n}
            </span>
            <span className={`text-xs uppercase tracking-widest ${step >= n ? 'text-white' : 'text-white/30'}`}>
              {n === 1 ? 'Día y hora' : 'Tus datos'}
            </span>
            {n === 1 && <span className={`flex-1 h-px ${step > 1 ? 'bg-[var(--signal)]' : 'bg-white/15'}`} />}
          </div>
        ))}
      </div>

      {error && (
        <p role="alert" className="mb-6 text-sm text-red-400">
          {error}
        </p>
      )}

      {step === 1 && (
        <div>
          {days.length === 0 ? (
            <p className="text-white/50 text-sm">Cargando disponibilidad…</p>
          ) : (
            <>
              <span className={labelClass}>Elige un día</span>
              <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1 mb-8" role="radiogroup" aria-label="Día de la llamada">
                {days.map((d) => {
                  const p = dayParts(d);
                  const selected = d === date;
                  return (
                    <button
                      key={d}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setDate(d)}
                      className={`shrink-0 w-[68px] py-3 rounded-2xl border text-center transition-colors ${
                        selected
                          ? 'bg-[var(--signal)] border-[var(--signal)] text-black'
                          : 'border-white/15 text-white/70 hover:border-white/40'
                      }`}
                    >
                      <div className="text-[11px] uppercase tracking-wider opacity-70">{p.weekday}</div>
                      <div className="font-kinetic text-xl leading-tight">{p.day}</div>
                      <div className="text-[11px] uppercase tracking-wider opacity-70">{p.month}</div>
                    </button>
                  );
                })}
              </div>

              <span className={labelClass}>Elige una hora</span>
              {slotsLoading ? (
                <div className="flex items-center gap-2 text-white/40 text-sm py-3">
                  <Loader2 className="w-4 h-4 animate-spin" /> Buscando huecos…
                </div>
              ) : slots.some((s) => s.available) ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Hora de la llamada">
                  {slots.map((s) => (
                    <button
                      key={s.time}
                      type="button"
                      role="radio"
                      aria-checked={time === s.time}
                      disabled={!s.available}
                      onClick={() => setTime(s.time)}
                      className={`py-3 rounded-xl border text-sm transition-colors ${
                        time === s.time
                          ? 'bg-[var(--signal)] border-[var(--signal)] text-black font-medium'
                          : s.available
                            ? 'border-white/15 text-white/80 hover:border-white/40'
                            : 'border-white/5 text-white/20 line-through cursor-not-allowed'
                      }`}
                    >
                      {s.time}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-white/50 text-sm py-3">No quedan huecos este día. Prueba con otro.</p>
              )}
              <p className="flex items-center gap-1.5 text-xs text-white/30 mt-4">
                <Clock className="w-3.5 h-3.5" /> Llamada de 30 min · horario de Madrid ({BOOKING_TZ})
              </p>

              <div className="flex justify-end mt-8">
                <button
                  type="button"
                  disabled={!time}
                  onClick={() => goToStep(2)}
                  className="group inline-flex items-center gap-3 pl-6 pr-2 py-2 rounded-full bg-[var(--signal)] text-black hover:bg-[var(--signal-dim)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="text-sm font-medium tracking-wide">Continuar</span>
                  <span className="w-9 h-9 rounded-full bg-[#03150d] text-[var(--signal)] flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4" />
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {step === 2 && callAt && (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
          <div className="md:col-span-2 flex items-center justify-between gap-3 rounded-2xl border border-white/10 px-4 py-3">
            <div className="text-sm">
              <span className="text-white/70">{formatCallDate(callAt)}</span>
              <span className="text-white/30"> · </span>
              <span className="font-kinetic text-[var(--signal)]">{formatCallTime(callAt)}</span>
            </div>
            <button
              type="button"
              onClick={() => goToStep(1)}
              className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Cambiar
            </button>
          </div>

          {pack && (
            <p className="md:col-span-2 text-sm rounded-2xl border border-[var(--signal)]/40 bg-[var(--signal)]/10 px-4 py-3">
              <span className="text-white/60">Pack elegido:</span> <strong className="font-semibold">{pack}</strong>
            </p>
          )}

          <div>
            <label htmlFor={`${uid}-name`} className={labelClass}>Nombre</label>
            <input id={`${uid}-name`} required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Tu nombre" />
          </div>
          <div>
            <label htmlFor={`${uid}-company`} className={labelClass}>Empresa <span className="normal-case tracking-normal text-white/25">(opcional)</span></label>
            <input id={`${uid}-company`} autoComplete="organization" value={company} onChange={(e) => setCompany(e.target.value)} className={inputClass} placeholder="Nombre de tu empresa" />
          </div>
          <div>
            <label htmlFor={`${uid}-email`} className={labelClass}>Email</label>
            <input id={`${uid}-email`} type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="tu@empresa.com" />
          </div>
          <div>
            <label htmlFor={`${uid}-phone`} className={labelClass}>Teléfono</label>
            <input id={`${uid}-phone`} type="tel" required autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="+34 600 000 000" />
          </div>

          <fieldset className="md:col-span-2">
            <legend className={labelClass}>¿Qué necesitas? <span className="normal-case tracking-normal text-white/25">(elige las que quieras)</span></legend>
            <div className="flex flex-wrap gap-2">
              {NEED_OPTIONS.map((n) => (
                <Chip key={n} selected={needs.includes(n)} onClick={() => toggleNeed(n)}>{n}</Chip>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className={labelClass}>Presupuesto aproximado</legend>
            <div className="flex flex-wrap gap-2">
              {BUDGET_OPTIONS.map((b) => (
                <Chip key={b} selected={budget === b} onClick={() => setBudget(budget === b ? '' : b)}>{b}</Chip>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className={labelClass}>¿Cuándo quieres empezar?</legend>
            <div className="flex flex-wrap gap-2">
              {TIMELINE_OPTIONS.map((t) => (
                <Chip key={t} selected={timeline === t} onClick={() => setTimeline(timeline === t ? '' : t)}>{t}</Chip>
              ))}
            </div>
          </fieldset>

          <div className="md:col-span-2">
            <label htmlFor={`${uid}-message`} className={labelClass}>¿Algo más que debamos saber? <span className="normal-case tracking-normal text-white/25">(opcional)</span></label>
            <textarea id={`${uid}-message`} rows={2} value={message} onChange={(e) => setMessage(e.target.value)} className={`${inputClass} resize-none`} placeholder="Cuéntanos tu proyecto en una frase" />
          </div>

          <div className="md:col-span-2 flex items-center justify-between flex-wrap gap-4 mt-2">
            <p className="text-xs text-white/30 max-w-xs">
              Al agendar aceptas que {businessName} te contacte para esta llamada.
            </p>
            <button
              type="submit"
              disabled={status === 'sending'}
              className="group inline-flex items-center gap-3 pl-6 pr-2 py-2 rounded-full bg-[var(--signal)] text-black hover:bg-[var(--signal-dim)] disabled:opacity-60 transition-colors"
            >
              <span className="text-sm font-medium tracking-wide">
                {status === 'sending' ? 'Agendando…' : 'Confirmar llamada'}
              </span>
              <span className="w-9 h-9 rounded-full bg-[#03150d] text-[var(--signal)] flex items-center justify-center group-hover:rotate-45 transition-transform">
                {status === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
              </span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
