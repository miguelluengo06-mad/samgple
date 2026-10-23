'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Clock, Loader2, TriangleAlert } from 'lucide-react';
import { metaTrackOnce } from '@/lib/metaPixel';
import { clearCart } from '@/lib/useCart';

interface Confirmation {
  paid: boolean;
  pack: string;
  amount: number;
  monthly: boolean;
  vat: string;
  testMode: boolean;
}

type State = { kind: 'loading' } | { kind: 'error' } | { kind: 'done'; data: Confirmation };

/** Claqueta que se cierra de golpe al confirmarse el pago: ¡toma buena! */
function Clapper() {
  const calm = useReducedMotion();
  return (
    <div className="mx-auto w-52 select-none" aria-hidden="true">
      <motion.div
        style={{ transformOrigin: '0% 100%', background: 'repeating-linear-gradient(115deg, #0c1208 0 16px, #ecf2e0 16px 32px)' }}
        initial={calm ? false : { rotate: -26 }}
        animate={{ rotate: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 11, delay: 0.35 }}
        className="h-7 rounded-t-md border-2 border-[#ecf2e0]"
      />
      <div className="rounded-b-md border-2 border-t-0 border-[#ecf2e0] bg-[#0c1208] px-4 py-3 text-left font-mono-studio text-[10px] tracking-[0.16em] uppercase text-[#ecf2e0]/70">
        <div className="flex justify-between"><span>Escena</span><span className="text-[var(--lime)]">Pedido</span></div>
        <div className="flex justify-between mt-1.5"><span>Toma</span><span className="text-[var(--lime)]">Buena</span></div>
        <div className="flex justify-between mt-1.5"><span>Estado</span><span className="text-[var(--lime)]">Pagado ✓</span></div>
      </div>
    </div>
  );
}

/** Una sola comprobación por sesión: React StrictMode monta dos veces en desarrollo. */
function Confirm() {
  const params = useSearchParams();
  const sessionId = params.get('session_id') || '';
  const [state, setState] = useState<State>({ kind: sessionId ? 'loading' : 'error' });

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    fetch(`/api/public/pack-checkout/confirm?session_id=${encodeURIComponent(sessionId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: Confirmation) => {
        if (cancelled) return;
        setState({ kind: 'done', data });
        if (data.paid) clearCart(); // el pedido ya está pagado: el carrito se vacía
        // Purchase para Meta: solo pagos reales y una vez por pedido (el eventID evita duplicados al recargar)
        if (data.paid && !data.testMode) {
          metaTrackOnce(sessionId, 'Purchase', { value: data.amount, currency: 'EUR', content_name: data.pack, content_type: 'product' });
        }
      })
      .catch(() => !cancelled && setState({ kind: 'error' }));
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <div className="max-w-xl mx-auto px-5 py-24 text-center">
      {state.kind === 'loading' && (
        <>
          <Loader2 className="w-10 h-10 mx-auto animate-spin text-[var(--signal)]" aria-hidden="true" />
          <h1 className="font-kinetic font-black uppercase text-3xl mt-6">Comprobando tu pago…</h1>
          <p className="text-white/60 mt-3">Un segundo, estamos confirmándolo con Stripe.</p>
        </>
      )}

      {state.kind === 'done' && state.data.paid && (
        <>
          <Clapper />
          <h1 className="display-lg mt-10">¡Pago <em>recibido!</em></h1>
          <p className="text-white/70 mt-4 text-lg">
            Gracias por confiar en nosotros. Ya tenemos tu pedido y nos ponemos manos a la obra.
          </p>
          <dl
            className="mt-8 rounded-xl p-5 text-left space-y-3 border-2 border-dashed"
            style={{ background: '#f6f4ea', borderColor: 'rgba(20,27,10,0.45)', color: '#16210e' }}
          >
            <div className="flex justify-between gap-4">
              <dt style={{ opacity: 0.65 }}>Pack</dt>
              <dd className="font-semibold text-right">{state.data.pack || '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt style={{ opacity: 0.65 }}>Importe</dt>
              <dd className="font-semibold text-right tabular-nums">
                {state.data.amount.toLocaleString('es-ES')} € <span className="font-normal" style={{ opacity: 0.65 }}>({state.data.vat})</span>
                {state.data.monthly && <span className="font-normal" style={{ opacity: 0.65 }}> al mes</span>}
              </dd>
            </div>
          </dl>
          <ul className="mt-6 text-left text-white/70 space-y-2 text-[15px]">
            <li>· Te llegará el recibo y la factura de Stripe al correo que has indicado.</li>
            <li>· Te escribiremos hoy mismo para pedirte lo que necesitamos para empezar.</li>
          </ul>
          {state.data.testMode && (
            <p className="mt-6 text-xs text-white/50">Pago de prueba (modo test de Stripe): no se ha cobrado ningún importe real.</p>
          )}
        </>
      )}

      {state.kind === 'done' && !state.data.paid && (
        <>
          <Clock className="w-12 h-12 mx-auto text-[var(--signal)]" aria-hidden="true" />
          <h1 className="font-kinetic font-black uppercase text-3xl md:text-4xl leading-none mt-6">Tu pago está en camino</h1>
          <p className="text-white/70 mt-4">
            Stripe todavía no nos ha confirmado el pago (algunos métodos tardan unos minutos). Te avisaremos en cuanto llegue. Si tienes dudas, escríbenos.
          </p>
        </>
      )}

      {state.kind === 'error' && (
        <>
          <TriangleAlert className="w-12 h-12 mx-auto text-[var(--signal)]" aria-hidden="true" />
          <h1 className="font-kinetic font-black uppercase text-3xl md:text-4xl leading-none mt-6">No hemos podido comprobarlo</h1>
          <p className="text-white/70 mt-4">
            Si acabas de pagar, no te preocupes: el pago se registra igualmente y recibirás el recibo por correo. Si no lo ves en unos minutos, escríbenos.
          </p>
        </>
      )}

      <Link href="/" className="btn-signal mt-10">
        Volver a la web
        <span className="btn-dot"><ArrowUpRight className="w-4 h-4" aria-hidden="true" /></span>
      </Link>
    </div>
  );
}

export default function GraciasClient() {
  return (
    <div className="home-root min-h-screen relative">
      <main className="ink ink-glow relative z-[2] min-h-screen flex items-center justify-center">
        <Suspense fallback={null}>
          <Confirm />
        </Suspense>
      </main>
    </div>
  );
}
