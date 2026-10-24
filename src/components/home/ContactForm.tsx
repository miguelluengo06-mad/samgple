'use client';

import { useState } from 'react';
import { ArrowUpRight, CheckCircle2, Loader2 } from 'lucide-react';

const inputClass =
  'w-full bg-transparent border-b border-white/20 focus:border-[var(--signal)] outline-none py-3 text-base transition-colors placeholder:text-white/40';
const labelClass = 'block text-xs uppercase tracking-widest text-white/40 mb-1';

/** Formulario de contacto general: llega como propuesta al panel (Leads). */
export default function ContactForm() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) || '').trim();
    setStatus('sending');
    setError('');
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
          message: get('message'),
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

  if (status === 'done') {
    return (
      <div role="status" className="py-12 text-center">
        <CheckCircle2 className="w-12 h-12 mx-auto text-[var(--signal)]" aria-hidden="true" />
        <h3 className="font-kinetic font-black uppercase text-2xl mt-5">Mensaje enviado</h3>
        <p className="text-white/60 mt-3 max-w-sm mx-auto">Gracias. Te respondemos por email en menos de 24 h laborables.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6" aria-label="Contacto">
      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <label htmlFor="contact-name" className={labelClass}>Nombre</label>
          <input id="contact-name" name="name" required autoComplete="name" className={inputClass} placeholder="Cómo te llamas…" />
        </div>
        <div>
          <label htmlFor="contact-email" className={labelClass}>Email</label>
          <input id="contact-email" name="email" type="email" required autoComplete="email" spellCheck={false} className={inputClass} placeholder="tu@empresa.com" />
        </div>
        <div>
          <label htmlFor="contact-company" className={labelClass}>Empresa (opcional)</label>
          <input id="contact-company" name="company" autoComplete="organization" className={inputClass} placeholder="Nombre de tu empresa…" />
        </div>
        <div>
          <label htmlFor="contact-phone" className={labelClass}>Teléfono (opcional)</label>
          <input id="contact-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" className={inputClass} placeholder="+34 600 000 000" />
        </div>
      </div>
      <div>
        <label htmlFor="contact-message" className={labelClass}>¿Qué necesitas?</label>
        <textarea id="contact-message" name="message" required rows={4} className={`${inputClass} resize-none`} placeholder="Cuéntanos tu idea, tu producto o tu duda…" />
      </div>
      {/* Señuelo para bots: las personas no lo ven */}
      <input name="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
      <button type="submit" disabled={status === 'sending'} className="btn-signal w-fit disabled:opacity-60">
        {status === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : null}
        Enviar mensaje
        <span className="btn-dot"><ArrowUpRight className="w-4 h-4" aria-hidden="true" /></span>
      </button>
    </form>
  );
}
