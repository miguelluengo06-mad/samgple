'use client';

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
