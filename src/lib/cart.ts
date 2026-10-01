import { WELCOME_PACK, getPurchasable, type PurchasablePack } from '@/lib/packs';

/**
 * Carrito de la web. Funciones puras: las usan el navegador (carrito guardado en localStorage) y el servidor
 * (que vuelve a validarlo todo y toma los precios SIEMPRE de src/lib/packs.ts, nunca del navegador).
 *
 * Solo se pueden meter packs de pago único. El Pack de Bienvenida no va al carrito: se compra desde su formulario.
 */

export const CART_MAX_QTY = 10;
export const CART_MAX_LINES = 8;

export interface CartItem {
  id: string;
  qty: number;
}

export interface CartLine {
  pack: PurchasablePack;
  qty: number;
  /** Céntimos, IVA incluido: precio × cantidad */
  totalCents: number;
}

export function isCartable(id: unknown): boolean {
  if (typeof id !== 'string') return false;
  const pack = getPurchasable(id);
  return !!pack && pack.id !== WELCOME_PACK.id && pack.mode === 'payment';
}

/** Limpia lo que venga del navegador: ids válidos, cantidades enteras entre 1 y el máximo, sin duplicados. */
export function sanitizeCart(input: unknown): CartItem[] {
  if (!Array.isArray(input)) return [];
  const merged = new Map<string, number>();
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const { id, qty } = raw as { id?: unknown; qty?: unknown };
    if (!isCartable(id)) continue;
    const n = Math.floor(Number(qty));
    if (!Number.isFinite(n) || n < 1) continue;
    merged.set(id as string, Math.min(CART_MAX_QTY, (merged.get(id as string) || 0) + n));
  }
  return [...merged.entries()].slice(0, CART_MAX_LINES).map(([id, qty]) => ({ id, qty }));
}

export function cartLines(items: CartItem[]): CartLine[] {
  const lines: CartLine[] = [];
  for (const { id, qty } of sanitizeCart(items)) {
    const pack = getPurchasable(id)!;
    lines.push({ pack, qty, totalCents: pack.cents * qty });
  }
  return lines;
}

export function cartTotalCents(items: CartItem[]): number {
  return cartLines(items).reduce((sum, l) => sum + l.totalCents, 0);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.qty, 0);
}

/** "Anuncios UGC con IA · Escala ×2 + Vídeo suelto ×3" (para el recibo y las notas) */
export function cartSummary(lines: CartLine[]): string {
  return lines.map((l) => `${l.pack.name}${l.qty > 1 ? ` ×${l.qty}` : ''}`).join(' + ');
}

/** Lo que se guarda en la sesión de Stripe (metadata ≤ 500 caracteres): [[id, cantidad, céntimos por unidad], …] */
export function compactItems(lines: CartLine[]): string {
  return JSON.stringify(lines.map((l) => [l.pack.id, l.qty, l.pack.cents]));
}

export interface OrderItem {
  pack_id: string;
  name: string;
  qty: number;
  /** € IVA incluido por unidad, tal y como se cobró */
  unit_eur: number;
  total_eur: number;
}

/** Vuelve a leer lo guardado con compactItems. Ignora lo que no sea válido; el nombre sale del catálogo. */
export function parseCompactItems(raw: unknown): OrderItem[] {
  if (typeof raw !== 'string' || !raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    const out: OrderItem[] = [];
    for (const row of arr) {
      if (!Array.isArray(row)) continue;
      const [id, qty, cents] = row;
      const pack = typeof id === 'string' ? getPurchasable(id) : null;
      const q = Math.floor(Number(qty));
      const c = Math.floor(Number(cents));
      if (!pack || !(q >= 1) || !(c >= 0)) continue;
      out.push({ pack_id: pack.id, name: pack.name, qty: q, unit_eur: c / 100, total_eur: (c * q) / 100 });
    }
    return out;
  } catch {
    return [];
  }
}
