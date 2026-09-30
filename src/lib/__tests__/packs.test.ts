import { describe, it, expect } from 'vitest';
import {
  PACK_GROUPS,
  SINGLE_VIDEO,
  EXTRAS,
  WELCOME_PACK,
  WELCOME_SPOTS_LEFT,
  WELCOME_SPOTS_TOTAL,
  formatAmount,
  formatEur,
  startingPrice,
  unitLabel,
  welcomeSpots,
} from '../packs';

describe('formatAmount / formatEur', () => {
  it('writes thousands with a dot, like the price list (1.490 €)', () => {
    expect(formatAmount(99)).toBe('99');
    expect(formatAmount(890)).toBe('890');
    expect(formatAmount(1490)).toBe('1.490');
    expect(formatEur(1490)).toBe('1.490 €');
    expect(formatEur(30)).toBe('30 €');
  });
});

describe('price table (exactly as agreed — do not round or change)', () => {
  // [servicio, pack, precio €, unidad]
  const TABLE: [string, string, number, string][] = [
    ['Anuncios UGC con IA', 'Básico', 290, 'once'],
    ['Anuncios UGC con IA', 'Pro', 490, 'once'],
    ['Anuncios UGC con IA', 'Mensual', 790, 'month'],
    ['Influencer IA para tu marca', 'Creación del personaje', 290, 'once'],
    ['Influencer IA para tu marca', 'Presencia', 490, 'month'],
    ['Influencer IA para tu marca', 'Crecimiento', 890, 'month'],
    ['Influencer IA para tu marca', 'Marca', 1490, 'month'],
    ['Vídeos para Ecommerce', 'Producto', 99, 'once'],
    ['Vídeos para Ecommerce', 'Colección', 349, 'once'],
    ['Vídeos para Ecommerce', 'Catálogo', 890, 'once'],
    ['Avatar IA a medida', 'Avatar Básico', 290, 'once'],
    ['Avatar IA a medida', 'Avatar Pro', 490, 'once'],
    ['Tu réplica digital', 'Réplica Esencial', 490, 'once'],
    ['Tu réplica digital', 'Réplica Pro', 890, 'once'],
    ['Tu réplica digital', 'Mensual 8', 390, 'month'],
    ['Tu réplica digital', 'Mensual 16', 690, 'month'],
  ];

  it('has every pack of the table, with its exact price and unit', () => {
    const actual = PACK_GROUPS.flatMap((g) => g.packs.map((p) => [g.title, p.name, p.price, p.unit]));
    expect(actual).toEqual(TABLE);
  });

  it('single video and extras', () => {
    expect([SINGLE_VIDEO.name, SINGLE_VIDEO.price, SINGLE_VIDEO.unit]).toEqual(['Vídeo suelto', 40, 'video']);
    expect(SINGLE_VIDEO.includes).toEqual(['1 vídeo', '1 revisión', 'Entrega en 5 días']);
    expect(EXTRAS.map((e) => [e.name, e.price])).toEqual([
      ['Gancho adicional', '15 €'],
      ['Revisión extra', '20 €'],
      ['Entrega urgente (menos de 48 h)', '+30 %'],
    ]);
  });

  it('welcome pack: 30 €, 30 spots, 2 videos (1 base + 2 hooks), 72 h', () => {
    expect(WELCOME_PACK.price).toBe(30);
    expect(WELCOME_SPOTS_TOTAL).toBe(30);
    expect(WELCOME_PACK.includes[0]).toContain('2 vídeos');
    expect(WELCOME_PACK.includes[0]).toContain('1 vídeo base con 2 ganchos');
    expect(WELCOME_PACK.includes).toContain('Entrega en 72 h');
  });

  it('what each pack includes matches the table', () => {
    const inc = (group: string, name: string) => PACK_GROUPS.find((g) => g.title === group)!.packs.find((p) => p.name === name)!.includes;
    expect(inc('Influencer IA para tu marca', 'Creación del personaje')).toEqual(['Diseño del personaje', 'Voz', 'Personalidad', 'Ficha de estilo']);
    expect(inc('Vídeos para Ecommerce', 'Producto').join(' ')).toContain('1 producto × 3 vídeos');
    expect(inc('Vídeos para Ecommerce', 'Producto').join(' ')).toContain('9:16 y 1:1');
    expect(inc('Vídeos para Ecommerce', 'Colección').join(' ')).toContain('10 vídeos');
    expect(inc('Vídeos para Ecommerce', 'Catálogo').join(' ')).toContain('30 vídeos');
    expect(inc('Avatar IA a medida', 'Avatar Pro')).toEqual(['Todo lo anterior', '20 imágenes', 'Ficha de estilo', '5 vídeos']);
    expect(inc('Tu réplica digital', 'Réplica Pro')).toEqual(['Clon de tu imagen', 'Voz en español e inglés', '2 looks', '10 vídeos']);
    expect(inc('Influencer IA para tu marca', 'Marca')).toContain('Todo lo anterior');
  });
});

describe('price list', () => {
  const byId = (id: string) => PACK_GROUPS.find((g) => g.id === id)!;
  const prices = (id: string) => byId(id).packs.map((p) => [p.name, p.price, p.unit]);

  it('has the six offers in order', () => {
    expect(PACK_GROUPS.map((g) => g.id)).toEqual(['ugc', 'influencer', 'ecommerce', 'avatar', 'replica']);
    expect(SINGLE_VIDEO.price).toBe(40);
  });

  it('UGC', () => {
    expect(prices('ugc')).toEqual([['Básico', 290, 'once'], ['Pro', 490, 'once'], ['Mensual', 790, 'month']]);
    expect(byId('ugc').packs[1].badge).toBe('El más elegido');
  });

  it('Influencer IA', () => {
    expect(prices('influencer')).toEqual([
      ['Creación del personaje', 290, 'once'],
      ['Presencia', 490, 'month'],
      ['Crecimiento', 890, 'month'],
      ['Marca', 1490, 'month'],
    ]);
    expect(byId('influencer').packs[2].badge).toBe('Recomendado');
    expect(byId('influencer').packs[0].priceNote).toContain('Gratis si contratas 6 meses');
    expect(byId('influencer').conditions).toEqual(['Permanencia mínima de 3 meses', '2 rondas de revisión al mes']);
  });

  it('Ecommerce', () => {
    expect(prices('ecommerce').map((p) => p[1])).toEqual([99, 349, 890]);
  });

  it('Avatar', () => {
    expect(prices('avatar').map((p) => p[1])).toEqual([290, 490]);
  });

  it('Réplica digital, with the authorization notice', () => {
    expect(prices('replica').map((p) => [p[1], p[2]])).toEqual([[490, 'once'], [890, 'once'], [390, 'month'], [690, 'month']]);
    expect(byId('replica').notice).toContain('autorización por escrito');
  });

  it('extras', () => {
    expect(EXTRAS).toEqual([
      { name: 'Gancho adicional', price: '15 €' },
      { name: 'Revisión extra', price: '20 €' },
      { name: 'Entrega urgente (menos de 48 h)', price: '+30 %' },
    ]);
  });

  it('every pack has a price, a one-line "for who" and something included', () => {
    for (const g of PACK_GROUPS) {
      for (const p of [...g.packs, SINGLE_VIDEO]) {
        expect(p.price).toBeGreaterThan(0);
        expect(p.forWho.length).toBeGreaterThan(5);
        expect(p.includes.length).toBeGreaterThan(0);
      }
    }
  });

  it('every pack has a cover headline and every group a short name (product cards)', () => {
    for (const g of PACK_GROUPS) {
      expect(g.short.length).toBeGreaterThan(2);
      for (const p of g.packs) expect(p.headline.length).toBeGreaterThan(2);
    }
    expect(SINGLE_VIDEO.headline).toBe('1 vídeo');
    // the big number on the cover agrees with the pack: "20 vídeos/mes" ↔ 790 €/mes plan
    expect(PACK_GROUPS[0].packs.map((p) => p.headline)).toEqual(['10 vídeos', '15 vídeos', '20 vídeos/mes']);
  });

  it('at most one highlighted badge per group', () => {
    for (const g of PACK_GROUPS) expect(g.packs.filter((p) => p.badge).length).toBeLessThanOrEqual(1);
  });

  it('every group has a "desde" label for the landing summary', () => {
    expect(PACK_GROUPS.map((g) => g.from)).toEqual(['Desde 290 €', 'Desde 490 €/mes', 'Desde 99 €', 'Desde 290 €', 'Desde 490 €']);
  });

  it('startingPrice picks the cheapest pack of each group', () => {
    expect(startingPrice(byId('ugc'))).toEqual({ amount: 290, unit: 'once' });
    expect(startingPrice(byId('influencer'))).toEqual({ amount: 290, unit: 'once' });
    expect(startingPrice(byId('ecommerce'))).toEqual({ amount: 99, unit: 'once' });
    expect(unitLabel('month')).toBe('/mes');
  });
});

describe('Pack de Bienvenida', () => {
  it('matches the offer', () => {
    expect(WELCOME_PACK.price).toBe(30);
    expect(WELCOME_PACK.cta).toBe('Quiero mi pack por 30 €');
    expect(WELCOME_PACK.anchor).toBe('Un vídeo con creador humano cuesta entre 100 y 400 €');
    expect(WELCOME_PACK.conditions).toEqual(['1 producto', 'Sin revisiones', 'Una sola vez por empresa']);
    expect(WELCOME_PACK.includes).toHaveLength(4);
  });

  it('shows the hand-edited spots, never a fake countdown', () => {
    expect(WELCOME_SPOTS_TOTAL).toBe(30);
    const s = welcomeSpots();
    expect(s.left).toBe(WELCOME_SPOTS_LEFT);
    expect(s.left + s.taken).toBe(30);
  });

  it('clamps a wrongly edited number', () => {
    expect(welcomeSpots(-4)).toMatchObject({ left: 0, soldOut: true, taken: 30 });
    expect(welcomeSpots(99)).toMatchObject({ left: 30, soldOut: false, taken: 0 });
    expect(welcomeSpots(12.9)).toMatchObject({ left: 12, taken: 18 });
    expect(welcomeSpots(NaN)).toMatchObject({ left: 0, soldOut: true });
    expect(welcomeSpots(0).soldOut).toBe(true);
    expect(welcomeSpots(1).soldOut).toBe(false);
  });
});
