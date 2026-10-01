'use client';

import { StripeIntegration } from './StripeIntegration';
import { SmtpIntegration } from './SmtpIntegration';

/** Pagos (Stripe) y correo para los avisos de solicitudes y compras. */
export function PlatformSettings() {
  return (
    <div className="space-y-8">
      <section id="stripe" className="scroll-mt-24">
        <h2 className="pn-title mb-4">Stripe</h2>
        <StripeIntegration />
      </section>

      <section id="smtp" className="scroll-mt-24">
        <h2 className="pn-title mb-4">Email (avisos)</h2>
        <SmtpIntegration />
      </section>
    </div>
  );
}
