'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { OPEN_SETTINGS_EVENT, readConsent, saveConsent } from '@/lib/cookieConsent';

/**
 * Banner de cookies. "Aceptar" y "Rechazar" tienen el mismo peso visual y nada se activa antes de elegir.
 * Las cookies técnicas (sesión, este mismo aviso) no necesitan consentimiento y no se pueden desactivar.
 */
/** En los paneles (agencia y clientes) solo hay cookies técnicas: no hace falta pedir nada. */
const NO_BANNER = ['/portal', '/cuenta', '/vista-cliente'];

export default function CookieConsent() {
  const pathname = usePathname() || '/';
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

  if (!open || NO_BANNER.some((p) => pathname.startsWith(p))) return null;

  const btn = 'px-4 py-2.5 rounded-full border border-[#16210e]/30 text-sm font-medium text-[#16210e] hover:bg-[#16210e]/5 transition-colors cursor-pointer';

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-title"
      className="fixed inset-x-3 bottom-3 md:left-auto md:right-4 md:bottom-4 md:max-w-md z-[200] rounded-2xl border border-[#16210e]/20 bg-[#ffffff] p-5 shadow-2xl text-[#16210e] [color-scheme:light]"
    >
      <h2 id="cookie-title" className="text-sm font-semibold mb-1.5">Tu privacidad</h2>
      <p className="text-xs text-[#16210e]/70 leading-relaxed">
        Usamos cookies técnicas imprescindibles para que la web funcione. Con tu permiso, también cookies de análisis y de publicidad.
        Puedes aceptarlas, rechazarlas o elegir, y cambiarlo cuando quieras. Más información en la{' '}
        <Link href="/cookies" className="underline underline-offset-2 hover:text-[#16210e]">política de cookies</Link>.
      </p>

      {custom && (
        <div className="mt-4 space-y-3 text-xs">
          <label className="flex items-start gap-3 opacity-70">
            <input type="checkbox" checked disabled className="mt-0.5 accent-[var(--signal)]" />
            <span><strong className="text-[#16210e]">Técnicas</strong> — necesarias (sesión, seguridad, este aviso). Siempre activas.</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} className="mt-0.5 accent-[var(--signal)]" />
            <span><strong className="text-[#16210e]">Análisis</strong> — medir visitas para mejorar la web.</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="mt-0.5 accent-[var(--signal)]" />
            <span><strong className="text-[#16210e]">Publicidad</strong> — medir y mejorar nuestros anuncios (p. ej. Meta).</span>
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
