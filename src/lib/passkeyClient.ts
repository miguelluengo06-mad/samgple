'use client';

import { browserSupportsWebAuthn, startAuthentication, startRegistration } from '@simplewebauthn/browser';

export const passkeysSupported = () => typeof window !== 'undefined' && browserSupportsWebAuthn();

/** Traduce los errores habituales del navegador a mensajes entendibles. */
function friendly(err: unknown): Error {
  const name = (err as { name?: string })?.name;
  if (name === 'NotAllowedError' || name === 'AbortError') return new Error('Se canceló. Vuelve a intentarlo cuando quieras.');
  if (name === 'InvalidStateError') return new Error('Ese dispositivo ya está registrado.');
  if (name === 'SecurityError') return new Error('Este navegador no permite passkeys en esta dirección.');
  return err instanceof Error ? err : new Error('No se pudo completar.');
}

const post = async (url: string, body?: unknown, token?: string) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body ?? {}),
  });
  if (res.status === 403 && !(res.headers.get('content-type') || '').includes('json')) throw new Error('Acceso denegado desde este dispositivo.');
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'No se pudo completar.'), { setup: !!data.setup });
  return data;
};

/** Entrar con passkey: el navegador pide huella, cara o PIN (o un QR para usar el móvil). Devuelve la sesión. */
export async function loginWithPasskey(): Promise<{ access_token: string; refresh_token: string }> {
  const { options, challengeId } = await post('/api/auth/passkey/login/options');
  let response;
  try {
    response = await startAuthentication({ optionsJSON: options });
  } catch (err) {
    throw friendly(err);
  }
  return post('/api/auth/passkey/login/verify', { challengeId, response });
}

/** Registrar este dispositivo (o el móvil, escaneando el QR que muestra el navegador). Devuelve cuántos tiene ya. */
export async function registerPasskey(token: string, name: string): Promise<number> {
  const { options, challengeId } = await post('/api/auth/passkey/register/options', {}, token);
  let response;
  try {
    response = await startRegistration({ optionsJSON: options });
  } catch (err) {
    throw friendly(err);
  }
  const data = await post('/api/auth/passkey/register/verify', { challengeId, response, name }, token);
  return data.count as number;
}
