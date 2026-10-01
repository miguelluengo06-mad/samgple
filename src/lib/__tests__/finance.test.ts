import { describe, it, expect } from 'vitest';
import { buildMonths, byPack, lastMonthKeys, monthKey } from '@/lib/finance';

const at = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);

describe('finance', () => {
  it('uses Madrid time for month boundaries', () => {
    // 31 Jan 23:30 UTC is already 1 Feb in Madrid (UTC+1)
    expect(monthKey(at('2026-01-31T23:30:00Z'))).toBe('2026-02');
    expect(monthKey(at('2026-01-31T10:00:00Z'))).toBe('2026-01');
  });

  it('lists the last months across a year boundary, oldest first', () => {
    expect(lastMonthKeys(at('2026-02-10T12:00:00Z'), 4)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
  });

  it('aggregates gross, VAT, refunds and net per month', () => {
    const now = at('2026-09-30T12:00:00Z');
    const months = buildMonths(
      [
        { paidAt: at('2026-09-05T10:00:00Z'), total: 12100, tax: 2100, packName: 'A' },
        { paidAt: at('2026-09-20T10:00:00Z'), total: 6050, tax: 1050, packName: 'B' },
        { paidAt: at('2026-08-01T10:00:00Z'), total: 3630, tax: 630, packName: 'A' },
        { paidAt: at('2020-01-01T10:00:00Z'), total: 999, tax: 0, packName: 'old' },
      ],
      [{ created: at('2026-09-25T10:00:00Z'), amount: 1000 }],
      now,
      3
    );
    expect(months.map((m) => m.key)).toEqual(['2026-07', '2026-08', '2026-09']);
    expect(months[2]).toMatchObject({ gross: 18150, tax: 3150, refunds: 1000, net: 14000, invoices: 2 });
    expect(months[1].net).toBe(3000);
    expect(months[0].net).toBe(0);
  });

  it('ranks packs by net revenue', () => {
    const rows = byPack([
      { paidAt: 1, total: 1210, tax: 210, packName: 'A' },
      { paidAt: 1, total: 6050, tax: 1050, packName: 'B' },
      { paidAt: 1, total: 1210, tax: 210, packName: 'A' },
    ]);
    expect(rows.map((r) => r.name)).toEqual(['B', 'A']);
    expect(rows[1]).toMatchObject({ net: 2000, invoices: 2 });
  });

  it('splits a multi-pack invoice across its lines by weight', () => {
    const rows = byPack([
      { paidAt: 1, total: 12100, tax: 2100, packName: 'A + B', lines: [{ name: 'A', gross: 6050 }, { name: 'B', gross: 6050 }] },
      { paidAt: 1, total: 6050, tax: 1050, packName: 'A', lines: [{ name: 'A', gross: 6050 }] },
    ]);
    expect(rows.map((r) => [r.name, Math.round(r.net)])).toEqual([['A', 10000], ['B', 5000]]);
  });
});
