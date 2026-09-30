'use client';

import { useEffect, useState } from 'react';
import { Loader2, Lock } from 'lucide-react';

/**
 * Pide a /api/public/pack-checkout una sesión de Stripe Checkout para un pack y devuelve su URL.
 * El importe lo decide el servidor (src/lib/packs.ts); aquí solo viaja el identificador del pack.
 */
export async function startPackCheckout(packId: string, opts: { leadId?: string; returnPath?: string } = {}): Promise<string> {
  const res = await fetch('/api/public/pack-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ packId, ...opts }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) throw new Error(data.error || 'No hemos podido abrir el pago. Inténtalo de nuevo en un momento.');
  return data.url as string;
}

/** Botón "Comprar ahora": abre el pago seguro de Stripe para ese pack. */
export function BuyButton({
  packId,
  returnPath,
  label = 'Comprar ahora',
  className,
}: {
  packId: string;
  /** Ruta a la que vuelve el cliente si cancela el pago */
  returnPath: string;
  label?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Coming back with the browser's back button restores the page from cache with the button still "busy"
  useEffect(() => {
    const reset = (e: PageTransitionEvent) => {
      if (e.persisted) setBusy(false);
    };
    window.addEventListener('pageshow', reset);
    return () => window.removeEventListener('pageshow', reset);
  }, []);

  const buy = async () => {
    setBusy(true);
    setError(null);
    try {
      window.location.assign(await startPackCheckout(packId, { returnPath }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No hemos podido abrir el pago.');
      setBusy(false);
    }
  };

  return (
    <div className="pack-buy">
      <button type="button" onClick={buy} disabled={busy} aria-busy={busy} className={className}>
        {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Lock aria-hidden="true" />}
        {busy ? 'Abriendo el pago seguro…' : label}
      </button>
      {error && (
        <p role="alert" className="pack-buy__error">
          {error}
        </p>
      )}
    </div>
  );
}
