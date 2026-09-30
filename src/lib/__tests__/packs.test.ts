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
    ['Anuncios UGC con IA', 'Starter', 250, 'once'],
    ['Anuncios UGC con IA', 'Escala', 490, 'once'],
    ['Anuncios UGC con IA', 'Volumen', 690, 'once'],
    ['Influencer IA para tu marca', 'Presencia', 490, 'once'],
    ['Influencer IA para tu marca', 'Crecimiento', 690, 'once'],
    ['Influencer IA para tu marca', 'Dominio', 1190, 'once'],
    ['Clonación y gemelo digital IA', 'Marca Personal', 490, 'once'],
    ['Clonación y gemelo digital IA', 'Autoridad', 790, 'once'],
    ['Clonación y gemelo digital IA', 'Escala Total', 1290, 'once'],
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
    expect(inc('Influencer IA para tu marca', 'Presencia')[0]).toContain('9 vídeos');
    expect(inc('Influencer IA para tu marca', 'Crecimiento')[0]).toContain('14 vídeos');
    expect(inc('Clonación y gemelo digital IA', 'Autoridad')[1]).toContain('12 vídeos');
    expect(inc('Influencer IA para tu marca', 'Dominio')[0]).toContain('27 vídeos');
  });
});

describe('price list', () => {
  const byId = (id: string) => PACK_GROUPS.find((g) => g.id === id)!;
  const prices = (id: string) => byId(id).packs.map((p) => [p.name, p.price, p.unit]);

  it('has the three service lines in order', () => {
    expect(PACK_GROUPS.map((g) => g.id)).toEqual(['ugc', 'influencer', 'replica']);
    expect(SINGLE_VIDEO.price).toBe(40);
  });

  it('UGC', () => {
    expect(prices('ugc')).toEqual([['Starter', 250, 'once'], ['Escala', 490, 'once'], ['Volumen', 690, 'once']]);
    expect(byId('ugc').packs.map((p) => p.badge)).toEqual(['Ideal para testear', 'Más popular', 'Mejor precio por vídeo']);
    // solo el de 10 vídeos se resalta como recomendado
    expect(byId('ugc').packs.map((p) => p.featured)).toEqual([false, true, false]);
  });

  it('Influencer IA', () => {
    expect(prices('influencer')).toEqual([['Presencia', 490, 'once'], ['Crecimiento', 690, 'once'], ['Dominio', 1190, 'once']]);
    expect(byId('influencer').packs.map((p) => p.badge)).toEqual(['Ideal para empezar', 'Más popular', 'Máxima cobertura']);
    // solo Crecimiento (14 vídeos) se resalta como recomendado
    expect(byId('influencer').packs.map((p) => p.featured)).toEqual([false, true, false]);
    expect(byId('influencer').packs.map((p) => p.perUnit)).toEqual(['54,44 €', '49,28 €', '44,07 €']);
    // el precio por vídeo que se enseña cuadra con el total y la cantidad (con un céntimo de margen)
    for (const p of byId('influencer').packs) {
      const n = Number(p.headline.split(' ')[0]);
      expect(Math.abs(Number(p.perUnit!.replace(' €', '').replace(',', '.')) - p.price / n)).toBeLessThan(0.01);
    }
    expect(byId('influencer').conditions).toBeUndefined();
  });

  it('Clonación y gemelo digital IA, with the authorization notice', () => {
    expect(prices('replica').map((p) => [p[1], p[2]])).toEqual([[490, 'once'], [790, 'once'], [1290, 'once']]);
    expect(byId('replica').notice).toContain('autorización por escrito');
    expect(byId('replica').packs.map((p) => p.badge)).toEqual(['Ideal para empezar', 'Más popular', 'Máximo ahorro']);
    expect(byId('replica').packs.map((p) => p.featured)).toEqual([false, true, false]);
    expect(byId('replica').packs.map((p) => p.perUnit)).toEqual(['81,66 €', '65,83 €', '53,75 €']);
    expect(byId('replica').packs.map((p) => p.perk)).toEqual(['Setup incluido', 'Setup incluido', 'Setup gratis']);
    for (const p of byId('replica').packs) {
      const n = Number(p.headline.split(' ')[0]);
      expect(Math.abs(Number(p.perUnit!.replace(' €', '').replace(',', '.')) - p.price / n)).toBeLessThan(0.01);
    }
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
    // the big number on the cover agrees with the pack
    expect(PACK_GROUPS[0].packs.map((p) => p.headline)).toEqual(['5 vídeos', '10 vídeos', '20 vídeos']);
  });

  it('at most one highlighted (featured) pack per group', () => {
    for (const g of PACK_GROUPS) expect(g.packs.filter((p) => p.featured ?? !!p.badge).length).toBeLessThanOrEqual(1);
  });

  it('every group has a "desde" label for the landing summary', () => {
    expect(PACK_GROUPS.map((g) => g.from)).toEqual(['Desde 250 €', 'Desde 490 €', 'Desde 490 €']);
  });

  it('startingPrice picks the cheapest pack of each group', () => {
    expect(startingPrice(byId('ugc'))).toEqual({ amount: 250, unit: 'once' });
    expect(startingPrice(byId('influencer'))).toEqual({ amount: 490, unit: 'once' });
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
