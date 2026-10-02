/**
 * Meta Pixel. Solo se carga si hay ID y la persona ha aceptado las cookies de publicidad
 * (ver src/lib/cookieConsent.ts y src/components/MetaPixel.tsx).
 *
 * El ID va en la variable de entorno NEXT_PUBLIC_META_PIXEL_ID (Vercel → Settings → Environment Variables).
 * Vacío = píxel apagado. Al ser NEXT_PUBLIC_, hay que volver a desplegar tras cambiarla.
 */
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '';

/** Rutas donde nunca se carga (panel de administración y acceso). */
export const PIXEL_EXCLUDED_PREFIXES = ['/portal', '/cuenta', '/vista-cliente', '/auth', '/invite'];

type Fbq = (...args: unknown[]) => void;

declare global {
  interface Window {
    fbq?: Fbq & { queue?: unknown[]; loaded?: boolean; callMethod?: Fbq; push?: Fbq; version?: string };
    _fbq?: Window['fbq'];
  }
}

/** Instala el snippet oficial de Meta (cola de eventos + fbevents.js) una sola vez. */
export function loadMetaPixel(pixelId: string) {
  if (typeof window === 'undefined' || window.fbq) return;
  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue.push(args);
  } as NonNullable<Window['fbq']> & { queue: unknown[] };
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = '2.0';
  fbq.queue = [];
  window.fbq = fbq;
  window._fbq = fbq;
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(script);
  window.fbq('init', pixelId);
}

/** Envía un evento estándar; no hace nada si el píxel no está cargado (sin consentimiento o sin ID). */
export function metaTrack(event: string, params?: Record<string, unknown>, eventId?: string) {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
  if (eventId) window.fbq('track', event, params ?? {}, { eventID: eventId });
  else window.fbq('track', event, params ?? {});
}

/** Como metaTrack, pero una sola vez por `key` en este navegador (p. ej. la compra al recargar /gracias). */
export function metaTrackOnce(key: string, event: string, params?: Record<string, unknown>) {
  const storageKey = `meta_evt_${key}`;
  try {
    if (localStorage.getItem(storageKey)) return;
    localStorage.setItem(storageKey, '1');
  } catch {
    /* sin almacenamiento: mejor duplicar que perder la conversión */
  }
  metaTrack(event, params, key);
}
