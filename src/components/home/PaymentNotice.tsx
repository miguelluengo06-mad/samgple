'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

/**
 * Aviso al volver de Stripe sin pagar (?pago=cancelado). Se cierra solo al pulsar la X y limpia el parámetro
 * de la URL para que no reaparezca al recargar.
 */
export default function PaymentNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('pago') !== 'cancelado') return;
    setVisible(true);
    url.searchParams.delete('pago');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      // Colores fijos: los tokens de Tailwind (white/black) cambian según la página y aquí debe leerse siempre igual
      style={{
        position: 'fixed', top: 84, left: '50%', transform: 'translateX(-50%)', zIndex: 80, width: 'min(560px, calc(100% - 24px))',
        background: '#ffffff', color: '#16210e', border: '1px solid #d3dcc0', boxShadow: '0 12px 32px rgba(20,27,10,0.18)',
      }}
      className="flex items-start gap-3 rounded-2xl px-4 py-3.5"
    >
      <p className="flex-1 text-sm leading-snug" style={{ color: '#16210e' }}>
        <strong>Pago cancelado.</strong> No se ha cobrado nada. Cuando quieras, puedes volver a intentarlo.
      </p>
      <button type="button" onClick={() => setVisible(false)} aria-label="Cerrar aviso" className="p-1 -m-1" style={{ color: '#16210e', opacity: 0.6 }}>
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
