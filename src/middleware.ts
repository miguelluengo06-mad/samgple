import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server';
import { detectAttack, getClientIp, isAllowlisted, isBlocked, reportSuspicious } from '@/lib/security';

/**
 * Puerta de entrada de toda la web:
 *  1. Si la IP está bloqueada, no ve nada (403 en cualquier página o API).
 *  2. Si pide rutas de escáner (/wp-admin, /.env, /phpmyadmin…) o manda firmas de inyección, se registra,
 *     se bloquea y se avisa por Telegram.
 *  3. Si manda una ráfaga absurda de peticiones, se corta.
 * Las IPs de SECURITY_ALLOWLIST_IPS (la tuya) se saltan todo esto.
 */

const deny = () => new NextResponse('Acceso denegado', { status: 403, headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8' } });

// Ráfagas: contador por IP en memoria (cada instancia lleva el suyo; basta para cortar un ataque evidente)
const BURST_WINDOW_MS = 10_000;
const BURST_MAX = 250;
const bursts = new Map<string, { n: number; start: number }>();

function burst(ip: string): boolean {
  const now = Date.now();
  const b = bursts.get(ip);
  if (!b || now - b.start > BURST_WINDOW_MS) {
    bursts.set(ip, { n: 1, start: now });
    if (bursts.size > 5000) bursts.clear();
    return false;
  }
  b.n += 1;
  return b.n === BURST_MAX; // true solo una vez por ventana
}

export async function middleware(req: NextRequest, event: NextFetchEvent) {
  const ip = getClientIp(req.headers);
  if (ip === 'unknown' || isAllowlisted(ip)) return NextResponse.next();

  if (await isBlocked(ip)) return deny();

  const { pathname, search } = req.nextUrl;
  const ua = req.headers.get('user-agent');

  const attack = detectAttack(pathname, search);
  if (attack) {
    event.waitUntil(reportSuspicious({ ip, kind: attack.kind, path: pathname, userAgent: ua, detail: attack.detail }));
    return deny();
  }

  if (burst(ip)) {
    event.waitUntil(reportSuspicious({ ip, kind: 'burst', path: pathname, userAgent: ua, detail: `${BURST_MAX}+ peticiones en ${BURST_WINDOW_MS / 1000} s` }));
    return new NextResponse('Demasiadas peticiones', { status: 429, headers: { 'Cache-Control': 'no-store' } });
  }

  return NextResponse.next();
}

export const config = {
  // Todo menos los archivos estáticos de Next y las imágenes/fuentes/vídeos públicos
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logos/|.*\\.(?:png|jpg|jpeg|gif|svg|webp|avif|ico|woff2?|css|js|map|mp4|webm|txt|xml)$).*)'],
};
