import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const { state, mockSupabaseAdmin, sendMail } = vi.hoisted(() => {
  const state = {
    owner: { id: 'owner-1' } as { id: string } | null,
    ownerMail: {} as Record<string, any>,
    insertError: null as null | { code?: string; message: string },
    soldOut: false,
    inserted: null as any,
  };

  const mockSupabaseAdmin = {
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        const chain: any = {
          select: () => chain,
          order: () => chain,
          limit: () => chain,
          eq: () => chain,
          // the owner lookup and the mailer lookup both read profiles
          maybeSingle: async () => ({ data: state.owner ? { ...state.owner, ...state.ownerMail } : null }),
        };
        return chain;
      }
      // leads
      return {
        insert: (row: any) => {
          state.inserted = row;
          return {
            select: () => ({
              single: async () => ({
                data: state.insertError ? null : { id: 'lead-1' },
                error: state.insertError,
              }),
            }),
          };
        },
      };
    }),
  };

  return { state, mockSupabaseAdmin, sendMail: vi.fn().mockResolvedValue({}) };
});

vi.mock('@/lib/supabaseAdmin', () => ({ supabaseAdmin: mockSupabaseAdmin }));
vi.mock('@/lib/packs', async (orig) => {
  const actual: any = await orig();
  return { ...actual, welcomeSpots: () => ({ ...actual.welcomeSpots(), soldOut: state.soldOut }) };
});
vi.mock('@/lib/encryption', () => ({ decrypt: (v: string) => v.replace('enc:', '') }));
vi.mock('nodemailer', () => ({ default: { createTransport: () => ({ sendMail }) } }));

import { POST } from '../route';

// ─── Helpers ──────────────────────────────────────────────────────────────────

let ipCounter = 0;

/** Every request gets its own IP so the in-memory rate limiter never interferes. */
function post(body: any): Promise<Response> {
  ipCounter += 1;
  const req = new Request('http://localhost/api/public/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': `10.0.0.${ipCounter}` },
    body: JSON.stringify(body),
  });
  return POST(req as any) as Promise<Response>;
}

/** A weekday well inside the booking window, so validateSlot accepts it. */
function bookableDate(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 7);
  while ([0, 6].includes(d.getUTCDay())) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

beforeEach(() => {
  state.owner = { id: 'owner-1' };
  state.ownerMail = {};
  state.soldOut = false;
  state.insertError = null;
  state.inserted = null;
  sendMail.mockClear();
  delete process.env.ADMIN_EMAIL;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
});

// ─── Booked call ──────────────────────────────────────────────────────────────

describe('POST /api/public/contact — booked call', () => {
  const call = () => ({
    kind: 'call',
    name: 'Laura Pérez',
    email: 'laura@empresa.com',
    phone: '+34 600 111 222',
    company: 'Marea',
    date: bookableDate(),
    time: '11:00',
    answers: { needs: ['Vídeo'], budget: 'Sin definir', timeline: 'Lo antes posible' },
  });

  it('stores the call as a lead attached to the agency owner', async () => {
    const res = await post(call());
    expect(res.status).toBe(200);
    expect(state.inserted).toMatchObject({
      owner_id: 'owner-1',
      kind: 'call',
      source: 'website',
      email: 'laura@empresa.com',
      phone: '+34 600 111 222',
      answers: { needs: ['Vídeo'], budget: 'Sin definir', timeline: 'Lo antes posible' },
    });
    expect(new Date(state.inserted.call_at).toString()).not.toBe('Invalid Date');
    expect((await res.json()).id).toBe('lead-1');
  });

  it('requires a valid email and phone', async () => {
    expect((await post({ ...call(), email: 'nope' })).status).toBe(400);
    expect((await post({ ...call(), phone: '' })).status).toBe(400);
    expect(state.inserted).toBeNull();
  });

  it('rejects a slot that is not offered', async () => {
    expect((await post({ ...call(), time: '11:30' })).status).toBe(400);
    expect(state.inserted).toBeNull();
  });

  it('answers 409 when the slot was taken in the meantime (unique index)', async () => {
    state.insertError = { code: '23505', message: 'duplicate key' };
    expect((await post(call())).status).toBe(409);
  });

  it('answers 503 when there is no agency owner yet', async () => {
    state.owner = null;
    expect((await post(call())).status).toBe(503);
  });

  it('drops answers that are not among the offered options', async () => {
    await post({ ...call(), answers: { needs: ['<script>'], budget: 'x', timeline: 'y' } });
    expect(state.inserted.answers).toEqual({ needs: [], budget: '', timeline: '' });
  });
});

// ─── Landing lead ─────────────────────────────────────────────────────────────

describe('POST /api/public/contact — landing lead', () => {
  const lead = () => ({
    source: 'landing',
    kind: 'proposal',
    name: 'Ana',
    phone: '+34 600 000 000',
    company: 'Tienda online',
    message: 'Influencer IA',
    utm: { utm_source: 'facebook', utm_campaign: 'otoño', fbclid: 'abc123', evil: 'ignored' },
  });

  it('saves WhatsApp-first leads without an email, with ad attribution', async () => {
    const res = await post(lead());
    expect(res.status).toBe(200);
    expect(state.inserted).toMatchObject({
      owner_id: 'owner-1',
      source: 'landing',
      kind: 'proposal',
      name: 'Ana',
      email: '',
      phone: '+34 600 000 000',
      company: 'Tienda online',
      message: 'Influencer IA',
      call_at: null,
    });
    // only known attribution keys survive
    expect(state.inserted.answers).toEqual({ utm: { utm_source: 'facebook', utm_campaign: 'otoño', fbclid: 'abc123' } });
  });

  it('uses a readable placeholder when "¿Qué te interesa?" is empty', async () => {
    await post({ ...lead(), message: '' });
    expect(state.inserted.message).toBe('Sin comentarios adicionales.');
  });

  it('stores no answers for organic visits', async () => {
    await post({ ...lead(), utm: undefined });
    expect(state.inserted.answers).toBeNull();
  });

  it('requires a valid WhatsApp number and a name', async () => {
    expect((await post({ ...lead(), phone: '' })).status).toBe(400);
    expect((await post({ ...lead(), phone: 'abc' })).status).toBe(400);
    expect((await post({ ...lead(), name: '' })).status).toBe(400);
    expect(state.inserted).toBeNull();
  });

  it('accepts an email when given, but rejects a malformed one', async () => {
    expect((await post({ ...lead(), email: 'ana@tienda.es' })).status).toBe(200);
    expect(state.inserted.email).toBe('ana@tienda.es');
    expect((await post({ ...lead(), email: 'no-es-un-email' })).status).toBe(400);
  });

  it('silently ignores submissions that fill the honeypot', async () => {
    const res = await post({ ...lead(), website: 'http://spam.example' });
    expect(res.status).toBe(200);
    expect(state.inserted).toBeNull();
  });

  it('does not let the website form skip the email by claiming source=landing on a call', async () => {
    const res = await post({ ...lead(), kind: 'call', date: bookableDate(), time: '10:00', email: '' });
    expect(res.status).toBe(400);
  });

  it('emails the agency about the lead when SMTP is configured', async () => {
    process.env.ADMIN_EMAIL = 'agencia@example.com';
    process.env.SMTP_USER = 'user';
    process.env.SMTP_PASS = 'pass';
    await post(lead());
    expect(sendMail).toHaveBeenCalledTimes(1);
    const mail = sendMail.mock.calls[0][0];
    expect(mail.subject).toContain('Nuevo lead de la landing');
    expect(mail.html).toContain('Fuente: facebook');
    expect(mail.text).toContain('utm_source=facebook');
    expect(mail.replyTo).toBeUndefined(); // no email to reply to
  });
});

// ─── Pack de Bienvenida ───────────────────────────────────────────────────────

describe('POST /api/public/contact — Pack de Bienvenida', () => {
  const pack = () => ({
    source: 'landing',
    kind: 'proposal',
    pack: 'welcome',
    name: 'Tienda Luna',
    company: 'Tienda Luna',
    phone: '+34 600 123 123',
    packData: { website: 'https://tiendaluna.es', product: 'Vela de soja', runsAds: 'Sí' },
    utm: { utm_source: 'instagram' },
  });

  it('stores the four form answers plus attribution, and writes a readable message', async () => {
    const res = await post(pack());
    expect(res.status).toBe(200);
    expect(state.inserted).toMatchObject({ source: 'landing', kind: 'proposal', name: 'Tienda Luna', company: 'Tienda Luna', email: '' });
    expect(state.inserted.answers).toEqual({
      pack: { id: 'welcome', website: 'https://tiendaluna.es', product: 'Vela de soja', runs_ads: 'Sí' },
      utm: { utm_source: 'instagram' },
    });
    expect(state.inserted.message).toContain('Pack de Bienvenida (30 € IVA incluido)');
    expect(state.inserted.message).toContain('Web o tienda: https://tiendaluna.es');
    expect(state.inserted.message).toContain('Producto a promocionar: Vela de soja');
    expect(state.inserted.message).toContain('¿Ya hace anuncios en redes?: Sí');
  });

  it.each([
    ['website', { website: '', product: 'x', runsAds: 'No' }],
    ['product', { website: 'https://a.es', product: '', runsAds: 'No' }],
    ['runsAds', { website: 'https://a.es', product: 'x', runsAds: '' }],
    ['runsAds value', { website: 'https://a.es', product: 'x', runsAds: 'quizá' }],
  ])('rejects a missing/invalid %s', async (_label, packData) => {
    expect((await post({ ...pack(), packData })).status).toBe(400);
    expect(state.inserted).toBeNull();
  });

  it('still needs a valid WhatsApp number', async () => {
    expect((await post({ ...pack(), phone: '' })).status).toBe(400);
  });

  it('refuses new orders when the spots are sold out (server-side, even if the page is stale)', async () => {
    state.soldOut = true;
    const res = await post(pack());
    expect(res.status).toBe(409);
    expect((await res.json()).error).toContain('agotado');
    expect(state.inserted).toBeNull();
  });

  it('includes the pack in the notification email', async () => {
    process.env.ADMIN_EMAIL = 'agencia@example.com';
    process.env.SMTP_USER = 'user';
    process.env.SMTP_PASS = 'pass';
    await post(pack());
    expect(sendMail.mock.calls[0][0].html).toContain('Pack de Bienvenida');
    expect(sendMail.mock.calls[0][0].html).toContain('Vela de soja');
  });
});

// ─── Email notification routing ───────────────────────────────────────────────

describe('POST /api/public/contact — who gets the notification', () => {
  const lead = { source: 'landing', kind: 'proposal', name: 'Ana', phone: '+34 600 000 000' };

  it('uses the SMTP saved in the panel and notifies the owner account', async () => {
    state.ownerMail = {
      email: 'duena@agencia.com',
      agency_smtp_enabled: true,
      agency_smtp_host: 'smtp.agencia.com',
      agency_smtp_port: 465,
      agency_smtp_user: 'envios@agencia.com',
      agency_smtp_sender: 'Agencia <envios@agencia.com>',
      agency_smtp_pass_encrypted: 'enc:secreto',
    };
    await post(lead);
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail.mock.calls[0][0]).toMatchObject({ to: 'duena@agencia.com', from: 'Agencia <envios@agencia.com>' });
  });

  it('falls back to the env configuration when the panel SMTP is off', async () => {
    process.env.ADMIN_EMAIL = 'env@agencia.com';
    process.env.SMTP_USER = 'user';
    process.env.SMTP_PASS = 'pass';
    state.ownerMail = { email: 'duena@agencia.com', agency_smtp_enabled: false };
    await post(lead);
    expect(sendMail.mock.calls[0][0].to).toBe('env@agencia.com');
  });

  it('still saves the lead when no email is configured at all', async () => {
    const res = await post(lead);
    expect(res.status).toBe(200);
    expect(sendMail).not.toHaveBeenCalled();
    expect(state.inserted).not.toBeNull();
  });

  it('still saves the lead when sending the email fails', async () => {
    process.env.ADMIN_EMAIL = 'env@agencia.com';
    process.env.SMTP_USER = 'user';
    process.env.SMTP_PASS = 'pass';
    sendMail.mockRejectedValueOnce(new Error('SMTP down'));
    const res = await post(lead);
    expect(res.status).toBe(200);
    expect(state.inserted).not.toBeNull();
  });
});

// ─── Website proposal (legacy) ────────────────────────────────────────────────

describe('POST /api/public/contact — website proposal', () => {
  it('still requires email and message', async () => {
    expect((await post({ name: 'A', message: 'hola' })).status).toBe(400);
    expect((await post({ name: 'A', email: 'a@b.es' })).status).toBe(400);
    const ok = await post({ name: 'A', email: 'a@b.es', message: 'hola' });
    expect(ok.status).toBe(200);
    expect(state.inserted).toMatchObject({ source: 'website', kind: 'proposal', email: 'a@b.es' });
  });
});
