/** Páginas privadas: el tráfico del panel de administración, las vistas previas y los enlaces de acceso no entra en las estadísticas. */
export const PRIVATE_PREFIXES = ['/portal', '/vista-cliente', '/auth/confirm', '/auth/set-password', '/invite'];

export interface AnalyticsEvent {
  type: 'pageview' | 'event';
  url: string;
}

/**
 * Filtro de Vercel Web Analytics: se envía solo la ruta (sin parámetros ni #: ahí pueden ir enlaces de acceso,
 * ids o datos de campañas) y nunca las páginas privadas. Devuelve null para descartar el evento.
 */
export function filterAnalyticsEvent<T extends AnalyticsEvent>(event: T): T | null {
  let url: URL;
  try {
    url = new URL(event.url);
  } catch {
    return null;
  }
  if (PRIVATE_PREFIXES.some((p) => url.pathname.startsWith(p))) return null;
  url.search = '';
  url.hash = '';
  return { ...event, url: url.toString() };
}
