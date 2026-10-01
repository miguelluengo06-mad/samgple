import { describe, it, expect } from 'vitest';
import { CART_MAX_LINES, CART_MAX_QTY, cartCount, cartLines, cartSummary, cartTotalCents, compactItems, isCartable, parseCompactItems, sanitizeCart } from '@/lib/cart';

describe('cart', () => {
  it('only lets one-off packs in: no welcome pack, no unknown ids', () => {
    expect(isCartable('ugc-escala')).toBe(true);
    expect(isCartable('video-suelto')).toBe(true);
    expect(isCartable('bienvenida')).toBe(false);
    expect(isCartable('nope')).toBe(false);
    expect(isCartable(42)).toBe(false);
  });

  it('sanitizes what the browser sends: merges duplicates, clamps quantities, drops junk', () => {
    const cart = sanitizeCart([
      { id: 'ugc-escala', qty: 2 },
      { id: 'ugc-escala', qty: 3 },
      { id: 'video-suelto', qty: 999 },
      { id: 'bienvenida', qty: 1 },
      { id: 'ugc-starter', qty: 0 },
      { id: 'ugc-volumen', qty: 'x' },
      null,
      'ugc-starter',
    ]);
    expect(cart).toEqual([
      { id: 'ugc-escala', qty: 5 },
      { id: 'video-suelto', qty: CART_MAX_QTY },
    ]);
    expect(sanitizeCart('nope')).toEqual([]);
    expect(sanitizeCart(undefined)).toEqual([]);
  });

  it('limits the number of lines', () => {
    const ids = ['ugc-starter', 'ugc-escala', 'ugc-volumen', 'influencer-presencia', 'influencer-crecimiento', 'influencer-dominio', 'replica-marca-personal', 'replica-autoridad', 'replica-escala-total', 'video-suelto'];
    expect(sanitizeCart(ids.map((id) => ({ id, qty: 1 }))).length).toBe(CART_MAX_LINES);
  });

  it('prices come from the catalog, never from the cart', () => {
    const items = sanitizeCart([{ id: 'ugc-escala', qty: 2, price: 1, cents: 1 }, { id: 'video-suelto', qty: 3 }]);
    expect(cartTotalCents(items)).toBe(39900 * 2 + 6000 * 3);
    expect(cartCount(items)).toBe(5);
    expect(cartLines(items).map((l) => l.totalCents)).toEqual([79800, 18000]);
    expect(cartSummary(cartLines(items))).toBe('Anuncios UGC con IA · Escala ×2 + Vídeo suelto ×3');
  });

  it('what is saved in the order round-trips, with names and totals from the catalog', () => {
    const lines = cartLines([{ id: 'ugc-escala', qty: 2 }, { id: 'video-suelto', qty: 1 }]);
    const raw = compactItems(lines);
    expect(raw.length).toBeLessThan(500); // límite de Stripe para un valor de metadata
    expect(parseCompactItems(raw)).toEqual([
      { pack_id: 'ugc-escala', name: 'Anuncios UGC con IA · Escala', qty: 2, unit_eur: 399, total_eur: 798 },
      { pack_id: 'video-suelto', name: 'Vídeo suelto', qty: 1, unit_eur: 60, total_eur: 60 },
    ]);
    expect(parseCompactItems('not json')).toEqual([]);
    expect(parseCompactItems(undefined)).toEqual([]);
    expect(parseCompactItems('[["nope",1,100],["ugc-escala",0,100]]')).toEqual([]);
  });

  it('the largest possible cart still fits in one Stripe metadata value', () => {
    const ids = ['ugc-starter', 'ugc-escala', 'ugc-volumen', 'influencer-presencia', 'influencer-crecimiento', 'influencer-dominio', 'replica-marca-personal', 'replica-escala-total'];
    expect(compactItems(cartLines(ids.map((id) => ({ id, qty: CART_MAX_QTY })))).length).toBeLessThan(500);
  });
});
