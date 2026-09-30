'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Clock, Loader2, TriangleAlert } from 'lucide-react';

interface Confirmation {
  paid: boolean;
  pack: string;
  amount: number;
  monthly: boolean;
  vat: string;
  testMode: boolean;
}

type State = { kind: 'loading' } | { kind: 'error' } | { kind: 'done'; data: Confirmation };

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
      .then((data: Confirmation) => !cancelled && setState({ kind: 'done', data }))
      .catch(() => !cancelled && setState({ kind: 'error' }));
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <div className="max-w-xl mx-auto px-4 pt-32 pb-24 text-center">
      {state.kind === 'loading' && (
        <>
          <Loader2 className="w-10 h-10 mx-auto animate-spin text-[var(--signal)]" aria-hidden="true" />
          <h1 className="font-kinetic font-black uppercase text-3xl mt-6">Comprobando tu pago…</h1>
          <p className="text-white/60 mt-3">Un segundo, estamos confirmándolo con Stripe.</p>
        </>
      )}

      {state.kind === 'done' && state.data.paid && (
        <>
          <CheckCircle2 className="w-14 h-14 mx-auto text-[var(--signal)]" aria-hidden="true" />
          <h1 className="font-kinetic font-black uppercase text-4xl md:text-5xl leading-none mt-6">¡Pago recibido!</h1>
          <p className="text-white/70 mt-4 text-lg">
            Gracias por confiar en nosotros. Ya tenemos tu pedido y nos ponemos manos a la obra.
          </p>
          <dl
            className="mt-8 rounded-2xl p-5 text-left space-y-3"
            style={{ background: 'rgba(255,255,255,0.78)', border: '1px solid rgba(20,27,10,0.12)', color: '#16210e' }}
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

      <Link
        href="/"
        className="mt-10 inline-flex items-center justify-center min-h-12 px-6 rounded-full bg-[var(--signal)] text-white text-sm font-semibold hover:bg-[var(--signal-dim)] transition-colors"
      >
        Volver a la web
      </Link>
    </div>
  );
}

export default function GraciasClient() {
  return (
    <div className="home-root min-h-screen relative">
      <main className="relative z-[2]">
        <Suspense fallback={null}>
          <Confirm />
        </Suspense>
      </main>
    </div>
  );
}
