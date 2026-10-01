import { afterEach, describe, expect, it, vi } from 'vitest';
import { leadAlertText, purchaseAlertText, sendTelegram } from '../telegram';

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_CHAT_ID;
});

describe('telegram', () => {
  it('does nothing without bot token and chat id', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await sendTelegram('hola')).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends the message with an https panel button only', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'T';
    process.env.TELEGRAM_CHAT_ID = '42';
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    expect(await sendTelegram('hola', { label: 'Abrir', url: 'https://x.com/portal' })).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.telegram.org/botT/sendMessage');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ chat_id: '42', text: 'hola', parse_mode: 'HTML' });
    expect(body.reply_markup.inline_keyboard[0][0]).toEqual({ text: 'Abrir', url: 'https://x.com/portal' });

    await sendTelegram('hola', { label: 'Abrir', url: 'http://localhost:3001/portal' });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).reply_markup).toBeUndefined();
  });

  it('never throws when Telegram fails', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'T';
    process.env.TELEGRAM_CHAT_ID = '42';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    expect(await sendTelegram('hola')).toBe(false);
  });

  it('escapes HTML in names and messages', () => {
    const t = leadAlertText({ name: '<b>Ana</b>', message: 'a & b', kind: 'proposal', source: 'website' });
    expect(t).toContain('&lt;b&gt;Ana&lt;/b&gt;');
    expect(t).toContain('a &amp; b');
  });

  it('shows the call date for booked calls and the amount for purchases', () => {
    const call = leadAlertText({ name: 'Ana', phone: '600000000', kind: 'call', source: 'website', callAt: new Date('2026-10-14T15:00:00Z') });
    expect(call).toContain('Llamada agendada');
    expect(call).toContain('17:00');
    expect(purchaseAlertText({ packName: 'UGC · Escala', amountEur: 320, livemode: true })).toContain('320 €');
    expect(purchaseAlertText({ packName: 'x', amountEur: 1, livemode: false })).toContain('(prueba)');
  });
});
