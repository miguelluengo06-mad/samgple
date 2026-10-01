import { BOOKING_TZ, formatCallDate, formatCallTime } from '@/lib/booking';

/**
 * Avisos por Telegram al móvil de la agencia: nueva solicitud, llamada agendada y compra pagada.
 *
 *  1. En Telegram, habla con @BotFather → /newbot → copia el token  → TELEGRAM_BOT_TOKEN
 *  2. Abre tu bot y escríbele «hola». Luego visita https://api.telegram.org/bot<TOKEN>/getUpdates
 *     y copia  "chat":{"id": …}  → TELEGRAM_CHAT_ID   (para un grupo, añade el bot al grupo y usa su id, que empieza por -)
 *  3. Pon las dos variables en Vercel (Settings → Environment Variables) y vuelve a desplegar.
 *
 * Sin las variables no hace nada. Nunca lanza: un fallo de Telegram no debe romper el guardado de la solicitud.
 */

const esc = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const clip = (v: string, n: number) => (v.length > n ? `${v.slice(0, n - 1)}…` : v);

export function telegramConfigured(): boolean {
  return !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

export async function sendTelegram(text: string, button?: { label: string; url: string }): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: clip(text, 3900),
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        // Telegram solo admite botones con enlaces https
        ...(button && button.url.startsWith('https://') ? { reply_markup: { inline_keyboard: [[{ text: button.label, url: button.url }]] } } : {}),
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error('Telegram: message rejected:', res.status, await res.text().catch(() => ''));
    return res.ok;
  } catch (err) {
    console.error('Telegram: could not send message:', err);
    return false;
  }
}

export interface LeadAlert {
  id?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  message?: string | null;
  kind: 'call' | 'proposal';
  source: string;
  callAt?: Date | null;
  packName?: string | null;
  utmSource?: string | null;
}

export function leadAlertText(l: LeadAlert): string {
  const lines: string[] = [];
  if (l.kind === 'call' && l.callAt) {
    lines.push('📞 <b>Llamada agendada</b>');
    lines.push(`🗓 <b>${esc(formatCallDate(l.callAt))} · ${esc(formatCallTime(l.callAt))}</b> (${BOOKING_TZ.split('/')[1]})`);
  } else if (l.packName) {
    lines.push('🎁 <b>Nueva solicitud · Pack de Bienvenida</b>');
  } else {
    lines.push('🆕 <b>Nueva solicitud</b>');
  }
  lines.push(`👤 ${esc(l.name)}${l.company ? ` · ${esc(l.company)}` : ''}`);
  if (l.phone) lines.push(`📱 ${esc(l.phone)}`);
  if (l.email) lines.push(`✉️ ${esc(l.email)}`);
  if (l.message && l.kind !== 'call') lines.push(`💬 ${esc(clip(l.message, 300))}`);
  const origin = [l.source === 'landing' ? 'Landing' : 'Web', l.utmSource].filter(Boolean).join(' · ');
  lines.push(`📍 ${esc(origin)}`);
  return lines.join('\n');
}

export function purchaseAlertText(p: { packName: string; amountEur: number; customer?: string | null; email?: string | null; phone?: string | null; livemode: boolean }): string {
  const lines = [
    `💶 <b>Nueva compra${p.livemode ? '' : ' (prueba)'}</b>`,
    `${esc(p.packName)} · <b>${p.amountEur.toLocaleString('es-ES')} €</b>`,
  ];
  if (p.customer) lines.push(`👤 ${esc(p.customer)}`);
  if (p.phone) lines.push(`📱 ${esc(p.phone)}`);
  if (p.email) lines.push(`✉️ ${esc(p.email)}`);
  return lines.join('\n');
}
