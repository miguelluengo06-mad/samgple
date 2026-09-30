/** Consentimiento de cookies: se guarda en el navegador y cualquier script no esencial debe consultarlo antes de cargarse. */

export type ConsentCategory = 'analytics' | 'marketing';

export interface ConsentState {
  /** Sube la versión cuando cambie el uso de cookies: volverá a preguntar */
  v: number;
  analytics: boolean;
  marketing: boolean;
  ts: number;
}

export const CONSENT_VERSION = 1;
export const CONSENT_KEY = 'cookie_consent';
export const CONSENT_EVENT = 'cookie-consent-change';
export const OPEN_SETTINGS_EVENT = 'open-cookie-settings';
const MAX_AGE_DAYS = 180;

export function readConsent(): ConsentState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as ConsentState;
    if (c.v !== CONSENT_VERSION || Date.now() - c.ts > MAX_AGE_DAYS * 86400000) return null;
    return c;
  } catch {
    return null;
  }
}

export function saveConsent(choice: { analytics: boolean; marketing: boolean }): ConsentState {
  const state: ConsentState = { v: CONSENT_VERSION, ...choice, ts: Date.now() };
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(state));
    // Copia en cookie técnica para que el servidor también pueda leerla
    document.cookie = `${CONSENT_KEY}=${state.analytics ? 1 : 0}${state.marketing ? 1 : 0}; max-age=${MAX_AGE_DAYS * 86400}; path=/; SameSite=Lax`;
  } catch {
    /* navegador sin almacenamiento: se volverá a preguntar */
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: state }));
  return state;
}

export function hasConsent(category: ConsentCategory): boolean {
  return readConsent()?.[category] === true;
}

/** Ejecuta `fn` cuando haya (o ya haya) consentimiento para la categoría. Devuelve la función para cancelar. */
export function whenConsented(category: ConsentCategory, fn: () => void): () => void {
  if (hasConsent(category)) {
    fn();
    return () => {};
  }
  const onChange = () => {
    if (hasConsent(category)) {
      window.removeEventListener(CONSENT_EVENT, onChange);
      fn();
    }
  };
  window.addEventListener(CONSENT_EVENT, onChange);
  return () => window.removeEventListener(CONSENT_EVENT, onChange);
}

export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT));
}
