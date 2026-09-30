import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { sendMail } = vi.hoisted(() => ({ sendMail: vi.fn().mockResolvedValue({}) }));
vi.mock('nodemailer', () => ({ default: { createTransport: () => ({ sendMail }) } }));
vi.mock('@/lib/encryption', () => ({ decrypt: (v: string) => v }));

import { resolveLeadMailer, sendLeadMail } from '@/lib/leadMailer';

const supabase = (profile: Record<string, unknown> | null) =>
  ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: profile }) }) }) }) }) as any;

const KEYS = ['RESEND_API_KEY', 'RESEND_FROM', 'LEAD_NOTIFY_EMAIL', 'ADMIN_EMAIL', 'N8N_SMTP_USER', 'N8N_SMTP_PASS'];
let saved: Record<string, string | undefined> = {};
beforeEach(() => {
  saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  KEYS.forEach((k) => delete process.env[k]);
  sendMail.mockClear();
});
afterEach(() => {
  KEYS.forEach((k) => (saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k])));
  vi.unstubAllGlobals();
});

describe('resolveLeadMailer — Resend', () => {
  it('usa Resend cuando hay RESEND_API_KEY, con el remitente y el destinatario configurados', async () => {
    process.env.RESEND_API_KEY = 're_123';
    process.env.RESEND_FROM = 'samgple <leads@samgple.com>';
    process.env.LEAD_NOTIFY_EMAIL = 'yo@samgple.com, socio@samgple.com';
    const m = await resolveLeadMailer(supabase({ email: 'duena@agencia.com' }), 'o1');
    expect(m).toMatchObject({ provider: 'resend', from: 'samgple <leads@samgple.com>', to: 'yo@samgple.com, socio@samgple.com' });
  });

  it('sin LEAD_NOTIFY_EMAIL avisa al correo de la cuenta y, sin RESEND_FROM, usa el remitente de pruebas', async () => {
    process.env.RESEND_API_KEY = 're_123';
    const m = await resolveLeadMailer(supabase({ email: 'duena@agencia.com' }), 'o1');
    expect(m?.to).toBe('duena@agencia.com');
    expect(m?.from).toContain('onboarding@resend.dev');
  });

  it('Resend tiene prioridad sobre el SMTP del panel', async () => {
    process.env.RESEND_API_KEY = 're_123';
    const m = await resolveLeadMailer(
      supabase({ email: 'a@b.es', agency_smtp_enabled: true, agency_smtp_host: 'h', agency_smtp_user: 'u', agency_smtp_pass_encrypted: 'p' }),
      'o1'
    );
    expect(m?.provider).toBe('resend');
  });

  it('sin nada configurado devuelve null', async () => {
    expect(await resolveLeadMailer(supabase({ email: 'a@b.es' }), 'o1')).toBeNull();
  });
});

describe('sendLeadMail', () => {
  const resendMailer = { provider: 'resend', resendApiKey: 're_123', from: 'samgple <leads@samgple.com>', to: 'a@x.es, b@x.es', origin: 'env', transport: {} as any } as const;

  it('envía a la API de Resend con clave, destinatarios en lista, reply_to e Idempotency-Key', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'e1' }) });
    vi.stubGlobal('fetch', fetchMock);
    await sendLeadMail(resendMailer, { subject: 'S', html: '<p>h</p>', text: 't', replyTo: 'cli@x.es', idempotencyKey: 'lead-1' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers.Authorization).toBe('Bearer re_123');
    expect(init.headers['Idempotency-Key']).toBe('lead-1');
    expect(JSON.parse(init.body)).toEqual({ from: 'samgple <leads@samgple.com>', to: ['a@x.es', 'b@x.es'], subject: 'S', html: '<p>h</p>', text: 't', reply_to: 'cli@x.es' });
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('si Resend rechaza el envío, lanza un error legible', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ message: 'The samgple.com domain is not verified.' }) }));
    await expect(sendLeadMail(resendMailer, { subject: 'S', html: 'h' })).rejects.toThrow('Resend 403: The samgple.com domain is not verified.');
  });

  it('con SMTP usa nodemailer', async () => {
    await sendLeadMail({ provider: 'smtp', transport: { host: 'h', port: 587, secure: false, auth: { user: 'u', pass: 'p' } }, from: 'f@x.es', to: 't@x.es', origin: 'env' }, { subject: 'S', html: 'h', replyTo: 'r@x.es' });
    expect(sendMail).toHaveBeenCalledWith({ from: 'f@x.es', to: 't@x.es', replyTo: 'r@x.es', subject: 'S', html: 'h' });
  });
});
