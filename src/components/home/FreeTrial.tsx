'use client';

import { useState } from 'react';
import { ArrowUpRight, CheckCircle2, Loader2 } from 'lucide-react';

const inputClass =
  'w-full bg-transparent border-b border-white/20 focus:border-[var(--signal)] outline-none py-3 text-base transition-colors placeholder:text-white/45';
const labelClass = 'block text-xs uppercase tracking-widest text-white/40 mb-1';

const PERKS = ['Un vídeo de prueba pensado para tu negocio', 'Guion aprobado por ti antes de producir', 'Sin tarjeta y sin compromiso'];

/** Solicitud de prueba gratuita para empresas: llega como propuesta al panel (Leads) con el motivo en el mensaje. */
export default function FreeTrial() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) || '').trim();
    setStatus('sending');
    setError('');
    const message = [
      'SOLICITUD DE PRUEBA GRATUITA',
      `Web o tienda: ${get('site') || '—'}`,
      `Qué quiere promocionar: ${get('goal')}`,
    ].join('\n');
    try {
      const res = await fetch('/api/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'proposal',
          name: get('name'),
          email: get('email'),
          phone: get('phone'),
          company: get('company'),
          message,
          website: get('hp'),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo enviar. Inténtalo de nuevo.');
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar. Inténtalo de nuevo.');
      setStatus('idle');
    }
  }

  return (
    <section id="prueba" className="px-5 md:px-10 py-16 md:py-28 scroll-mt-6">
      <div className="max-w-[1320px] mx-auto relative grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] rounded-[28px] overflow-hidden border-[1.5px] border-[#0c1208] shadow-[8px_8px_0_#0c1208]">
        {/* Talón: la oferta */}
        <div className="relative bg-[var(--lime)] text-[#0c1208] p-7 sm:p-10 lg:p-12 flex flex-col">
          <span className="inline-flex items-center gap-2 self-start rounded-full bg-[#0c1208] text-[var(--lime)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em]">
            <span className="rec-dot" aria-hidden="true" /> Para empresas
          </span>
          <h2 className="display-md mt-6 !text-[#0c1208]">
            Tu primer vídeo, <em className="!text-[#0c1208]">gratis</em>
          </h2>
          <p className="mt-5 max-w-md leading-relaxed text-[#0c1208]/80">
            Cuéntanos qué vendes y te preparamos un vídeo de prueba sin coste, para que veas el resultado antes de decidir nada.
          </p>
          <ul className="mt-8 space-y-3">
            {PERKS.map((p, i) => (
              <li key={p} className="flex items-start gap-3 text-sm font-medium">
                <span className="grid place-items-center w-6 h-6 shrink-0 rounded-full bg-[#0c1208] text-[var(--lime)] text-[11px] font-mono-studio">{i + 1}</span>
                {p}
              </li>
            ))}
          </ul>
          <p aria-hidden="true" className="font-kinetic font-black leading-[0.8] tracking-tighter text-[#0c1208] mt-10 lg:mt-auto pt-6 text-[6.5rem] sm:text-[9rem] lg:text-[10rem] select-none">
            0<span className="text-[0.5em] align-top">€</span>
          </p>
        </div>

        {/* Perforación del ticket */}
        <div aria-hidden="true" className="hidden lg:block absolute top-0 bottom-0 left-[42.5%] w-0 border-l-2 border-dashed border-[#0c1208]/70 z-[2]">
          <span className="absolute -left-3 -top-3 w-6 h-6 rounded-full bg-[var(--paper)] border-[1.5px] border-[#0c1208]" />
          <span className="absolute -left-3 -bottom-3 w-6 h-6 rounded-full bg-[var(--paper)] border-[1.5px] border-[#0c1208]" />
        </div>

        {/* Formulario */}
        <div className="ink bg-[var(--ink)] min-w-0 p-7 sm:p-10 lg:p-12">
          {status === 'done' ? (
            <div role="status" className="py-12 text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto text-[var(--lime)]" aria-hidden="true" />
              <h3 className="font-kinetic font-black uppercase text-2xl mt-5">Solicitud enviada</h3>
              <p className="text-white/60 mt-3 max-w-sm mx-auto">
                Hemos recibido tu petición. Te escribimos en menos de 24 h laborables para preparar tu prueba.
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="grid gap-6" aria-label="Solicitar prueba gratuita">
              <p className="kicker">/ Pide tu prueba</p>
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="trial-company" className={labelClass}>Empresa</label>
                  <input id="trial-company" name="company" required autoComplete="organization" className={inputClass} placeholder="Nombre de tu empresa…" />
                </div>
                <div>
                  <label htmlFor="trial-name" className={labelClass}>Tu nombre</label>
                  <input id="trial-name" name="name" required autoComplete="name" className={inputClass} placeholder="Cómo te llamas…" />
                </div>
                <div>
                  <label htmlFor="trial-email" className={labelClass}>Email</label>
                  <input id="trial-email" name="email" type="email" required autoComplete="email" spellCheck={false} className={inputClass} placeholder="tu@empresa.com" />
                </div>
                <div>
                  <label htmlFor="trial-phone" className={labelClass}>Teléfono (opcional)</label>
                  <input id="trial-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" className={inputClass} placeholder="+34 600 000 000" />
                </div>
              </div>
              <div>
                <label htmlFor="trial-site" className={labelClass}>Web o tienda (opcional)</label>
                <input id="trial-site" name="site" type="url" inputMode="url" autoComplete="url" spellCheck={false} className={inputClass} placeholder="https://…" />
              </div>
              <div>
                <label htmlFor="trial-goal" className={labelClass}>¿Qué quieres promocionar?</label>
                <textarea id="trial-goal" name="goal" required rows={3} className={`${inputClass} resize-none`} placeholder="Un producto, un servicio, una oferta…" />
              </div>
              {/* Señuelo para bots: las personas no lo ven */}
              <input name="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
              {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
              <button type="submit" disabled={status === 'sending'} className="btn-signal w-fit disabled:opacity-60">
                {status === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : null}
                Quiero mi prueba gratis
                <span className="btn-dot"><ArrowUpRight className="w-4 h-4" aria-hidden="true" /></span>
              </button>
              <p className="text-xs text-white/40">Sin tarjeta ni compromiso. Usaremos tus datos solo para contactarte.</p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
