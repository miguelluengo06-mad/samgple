/** Rutas con la experiencia "estudio" (cursor, barra de lectura, cortinilla). El panel y la cuenta quedan fuera a propósito. */
const PUBLIC_PREFIXES = ['/', '/gracias', '/auth', '/aviso-legal', '/privacidad', '/cookies', '/terminos'];

export function isStudioPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return PUBLIC_PREFIXES.some((p) => (p === '/' ? pathname === '/' : pathname === p || pathname.startsWith(`${p}/`)));
}
