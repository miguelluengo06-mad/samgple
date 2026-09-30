'use client';

import { openCookieSettings } from '@/lib/cookieConsent';

/** Enlace "Configurar cookies" para los pies de página: reabre el panel de consentimiento. */
export default function CookieSettingsLink({ className }: { className?: string }) {
  return (
    <button type="button" onClick={openCookieSettings} className={className ?? 'hover:text-white transition-colors cursor-pointer'}>
      Configurar cookies
    </button>
  );
}
