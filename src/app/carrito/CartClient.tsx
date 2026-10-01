'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2, Lock, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { CART_MAX_QTY, cartLines, cartTotalCents } from '@/lib/cart';
import { useCart } from '@/lib/useCart';
import { formatEur } from '@/lib/packs';

// Colores fijos: los tokens white/black de Tailwind cambian según la página y aquí el campo debe leerse siempre igual
const field =
  'w-full min-h-12 rounded-xl border border-[#16210e]/25 bg-[#fbfcf7] px-4 py-3 text-base text-[#16210e] placeholder:text-[#16210e]/45 outline-none focus:border-[var(--signal)] focus:ring-2 focus:ring-[var(--signal)]/30';

export default function CartClient() {
  const { items, ready, setQty, remove } = useCart();
  const lines = useMemo(() => cartLines(items), [items]);
  const total = cartTotalCents(items) / 100;

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('pago') === 'cancelado') {
      setCancelled(true);
      url.searchParams.delete('pago');
      window.history.replaceState(null, '', url.pathname + url.search);
    }
    // Volver con el botón «atrás» desde Stripe restaura la página con el botón ocupado
    const reset = (e: PageTransitionEvent) => { if (e.persisted) setBusy(false); };
    window.addEventListener('pageshow', reset);
    return () => window.removeEventListener('pageshow', reset);
  }, []);

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || lines.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/public/cart-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, email, name, phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || 'No hemos podido abrir el pago. Inténtalo de nuevo en un momento.');
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No hemos podido abrir el pago.');
      setBusy(false);
    }
  };

  if (!ready) return null;

  if (lines.length === 0) {
    return (
      <div className="max-w-xl mx-auto text-center home-slab p-8 md:p-12">
        <ShoppingCart className="w-10 h-10 mx-auto text-white/30" aria-hidden="true" />
        <h1 className="font-kinetic font-black uppercase text-3xl md:text-4xl leading-none mt-5">Tu carrito está vacío</h1>
        <p className="text-white/60 mt-3">Elige un pack y añádelo para pagar de forma segura con tarjeta.</p>
        <Link
          href="/#precios"
          className="mt-8 inline-flex items-center justify-center min-h-12 px-6 rounded-full bg-[var(--signal)] text-black text-sm font-semibold hover:bg-[var(--signal-dim)] transition-colors"
        >
          Ver packs y precios
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="font-kinetic font-black uppercase text-4xl md:text-6xl leading-none mb-6 md:mb-10">Tu carrito</h1>
      {cancelled && (
        <p role="status" className="mb-6 rounded-xl border border-white/15 bg-white/50 px-4 py-3 text-sm text-white/70">
          El pago se ha cancelado y no se ha cobrado nada. Tu carrito sigue aquí.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-start">
        <section aria-label="Productos" className="home-slab p-4 md:p-6">
          <ul className="divide-y divide-white/10">
            {lines.map(({ pack, qty, totalCents }) => (
              <li key={pack.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold leading-snug">{pack.name}</h2>
                  <p className="text-sm text-white/50 mt-0.5">{formatEur(pack.price)} cada uno · IVA incluido</p>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <div className="inline-flex items-center rounded-full border border-white/15" role="group" aria-label={`Cantidad de ${pack.name}`}>
                    <button
                      type="button"
                      onClick={() => setQty(pack.id, qty - 1)}
                      aria-label="Quitar una unidad"
                      className="w-11 h-11 grid place-items-center rounded-full hover:bg-white/10 cursor-pointer"
                    >
                      <Minus className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <span className="w-8 text-center tabular-nums font-semibold" aria-live="polite">{qty}</span>
                    <button
                      type="button"
                      onClick={() => setQty(pack.id, qty + 1)}
                      disabled={qty >= CART_MAX_QTY}
                      aria-label="Añadir una unidad"
                      className="w-11 h-11 grid place-items-center rounded-full hover:bg-white/10 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                  <span className="w-24 text-right font-semibold tabular-nums">{formatEur(totalCents / 100)}</span>
                  <button
                    type="button"
                    onClick={() => remove(pack.id)}
                    aria-label={`Quitar ${pack.name} del carrito`}
                    className="w-11 h-11 grid place-items-center rounded-full text-white/50 hover:text-white hover:bg-white/10 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <form onSubmit={pay} className="home-slab p-5 md:p-6 space-y-4 lg:sticky lg:top-24" aria-label="Datos y pago">
          <div className="flex items-baseline justify-between">
            <span className="text-white/60">Total</span>
            <span className="text-3xl font-extrabold tabular-nums">{formatEur(total)}</span>
          </div>
          <p className="text-xs text-white/50 -mt-2">IVA incluido. Recibirás la factura con el IVA desglosado.</p>

          <div className="space-y-1.5">
            <label htmlFor="cart-email" className="text-sm font-semibold">Email *</label>
            <input id="cart-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@empresa.com" className={field} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="cart-name" className="text-sm font-semibold">Nombre <span className="font-normal text-white/40">(opcional)</span></label>
            <input id="cart-name" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className={field} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="cart-phone" className="text-sm font-semibold">Teléfono <span className="font-normal text-white/40">(opcional)</span></label>
            <input id="cart-phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} placeholder="+34 600 000 000" className={field} />
          </div>

          <label className="flex items-start gap-3 text-sm text-white/70 cursor-pointer">
            <input type="checkbox" required checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1 w-5 h-5 shrink-0 accent-[var(--signal)]" />
            <span>
              He leído y acepto los{' '}
              <Link href="/terminos" target="_blank" className="underline underline-offset-2">términos y condiciones</Link> y la{' '}
              <Link href="/privacidad" target="_blank" className="underline underline-offset-2">política de privacidad</Link>.
            </span>
          </label>

          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={busy || !accepted}
            aria-busy={busy}
            className="w-full min-h-12 inline-flex items-center justify-center gap-2 rounded-full bg-[var(--signal)] text-black text-sm font-semibold hover:bg-[var(--signal-dim)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Lock className="w-4 h-4" aria-hidden="true" />}
            {busy ? 'Abriendo el pago seguro…' : `Pagar ${formatEur(total)}`}
          </button>
          <p className="text-xs text-center text-white/50">Pago seguro con tarjeta en Stripe. No guardamos los datos de tu tarjeta.</p>
        </form>
      </div>
    </div>
  );
}
