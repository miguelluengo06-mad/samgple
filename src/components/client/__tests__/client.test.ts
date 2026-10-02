import { describe, expect, it } from 'vitest';
import { CLIENT_PAGES, isClientPage } from '../types';
import { fromLead, sample } from '../previewData';
import type { Lead } from '@/app/portal/leads/context';

describe('client pages', () => {
  it('knows the pages of the customer panel and nothing else', () => {
    for (const p of CLIENT_PAGES) expect(isClientPage(p)).toBe(true);
    expect(CLIENT_PAGES).toEqual(['inicio', 'videos', 'avatares', 'avisos', 'compras', 'llamadas', 'ayuda', 'ajustes']);
    expect(isClientPage('admin')).toBe(false);
    expect(isClientPage('../etc')).toBe(false);
    expect(isClientPage(undefined)).toBe(false);
  });
});

describe('preview data', () => {
  it('the sample customer has credits, requests in several steps, a notice and a purchase', () => {
    const s = sample();
    expect(s.sample).toBe(true);
    expect(s.studio.balance).toBeGreaterThan(0);
    expect(new Set(s.studio.requests.map((r) => r.status))).toEqual(new Set(['script_review', 'production', 'delivered']));
    expect(s.studio.avatars.length).toBeGreaterThanOrEqual(4);
    expect(s.notices.some((n) => !n.read_at)).toBe(true);
    expect(s.purchases[0].amount_eur).toBe(320);
  });

  const lead = (o: Partial<Lead> & { id: string }): Lead => ({ name: 'Ana', email: 'ana@x.com', company: null, phone: null, message: '', status: 'new', kind: 'proposal', call_at: null, answers: null, source: 'website', notes: null, created_at: new Date().toISOString(), ...o });

  it('builds a real customer view from their own leads only (same email or phone)', () => {
    const a = lead({ id: '1', answers: { order: { session_id: 's', pack_id: 'ugc-escala', pack_name: 'UGC', amount_eur: 320, currency: 'eur', mode: 'payment', paid_at: '2026-01-01', livemode: true }, notices: [{ id: 'n1', title: 't', body: 'b', created_at: '2026-01-02T00:00:00Z' }] } });
    const b = lead({ id: '2', email: 'ana@x.com', kind: 'call', call_at: new Date(Date.now() + 86400000).toISOString() });
    const other = lead({ id: '3', name: 'Otro', email: 'otro@y.com', answers: { order: { session_id: 's2', pack_id: 'ugc-starter', pack_name: 'X', amount_eur: 190, currency: 'eur', mode: 'payment', paid_at: '2026-01-01', livemode: true } } });
    const v = fromLead(a, [a, b, other]);
    expect(v.sample).toBe(false);
    expect(v.purchases).toHaveLength(1);
    expect(v.purchases[0].amount_eur).toBe(320);
    expect(v.calls.some((c) => c.id === '2')).toBe(true);
    expect(v.notices).toHaveLength(1);
  });

  it('does not show test-mode purchases as real ones', () => {
    const a = lead({ id: '1', answers: { order: { session_id: 's', pack_id: 'ugc-escala', pack_name: 'UGC', amount_eur: 320, currency: 'eur', mode: 'payment', paid_at: '2026-01-01', livemode: false } } });
    expect(fromLead(a, [a]).purchases).toHaveLength(0);
  });
});
