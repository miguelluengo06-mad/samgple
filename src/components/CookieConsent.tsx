'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { OPEN_SETTINGS_EVENT, readConsent, saveConsent } from '@/lib/cookieConsent';

/**
 * Banner de cookies. "Aceptar" y "Rechazar" tienen el mismo peso visual y nada se activa antes de elegir.
 * Las cookies técnicas (sesión, este mismo aviso) no necesitan consentimiento y no se pueden desactivar.
 */
export default function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const current = readConsent();
    if (!current) setOpen(true);
    else {
      setAnalytics(current.analytics);
      setMarketing(current.marketing);
    }
    const reopen = () => {
      const c = readConsent();
      setAnalytics(c?.analytics ?? false);
      setMarketing(c?.marketing ?? false);
      setCustom(true);
      setOpen(true);
    };
    window.addEventListener(OPEN_SETTINGS_EVENT, reopen);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, reopen);
  }, []);

  const choose = (a: boolean, m: boolean) => {
    saveConsent({ analytics: a, marketing: m });
    setOpen(false);
    setCustom(false);
  };

  if (!open) return null;

  const btn = 'px-4 py-2.5 rounded-full border border-white/25 text-sm font-medium text-white hover:bg-white/10 transition-colors cursor-pointer';

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-title"
      className="fixed inset-x-3 bottom-3 md:left-auto md:right-4 md:bottom-4 md:max-w-md z-[200] rounded-2xl border border-white/15 bg-neutral-950/95 backdrop-blur-xl p-5 shadow-2xl text-white"
    >
      <h2 id="cookie-title" className="text-sm font-semibold mb-1.5">Tu privacidad</h2>
      <p className="text-xs text-white/60 leading-relaxed">
        Usamos cookies técnicas imprescindibles para que la web funcione. Con tu permiso, también cookies de análisis y de publicidad.
        Puedes aceptarlas, rechazarlas o elegir, y cambiarlo cuando quieras. Más información en la{' '}
        <Link href="/cookies" className="underline underline-offset-2 hover:text-white">política de cookies</Link>.
      </p>

      {custom && (
        <div className="mt-4 space-y-3 text-xs">
          <label className="flex items-start gap-3 opacity-70">
            <input type="checkbox" checked disabled className="mt-0.5 accent-[var(--signal)]" />
            <span><strong className="text-white">Técnicas</strong> — necesarias (sesión, seguridad, este aviso). Siempre activas.</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} className="mt-0.5 accent-[var(--signal)]" />
            <span><strong className="text-white">Análisis</strong> — medir visitas para mejorar la web.</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="mt-0.5 accent-[var(--signal)]" />
            <span><strong className="text-white">Publicidad</strong> — medir y mejorar nuestros anuncios (p. ej. Meta).</span>
          </label>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {custom ? (
          <button type="button" className={btn} onClick={() => choose(analytics, marketing)}>Guardar selección</button>
        ) : (
          <button type="button" className={btn} onClick={() => setCustom(true)}>Configurar</button>
        )}
        <button type="button" className={btn} onClick={() => choose(false, false)}>Rechazar</button>
        <button type="button" className={btn} onClick={() => choose(true, true)}>Aceptar todas</button>
      </div>
    </div>
  );
}
