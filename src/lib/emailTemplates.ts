import { formatCallDate, formatCallTime } from '@/lib/booking';
import { whatsappDigits } from '@/lib/contact';

/**
 * Correos de aviso para la agencia (leads y compras). HTML con tablas y estilos en línea para que se vea
 * igual en Gmail, Outlook y el móvil, más una versión en texto plano. Todo lo que escribe el visitante
 * se escapa antes de entrar en el HTML.
 */

const C = {
  page: '#eef0e6',
  card: '#ffffff',
  head: '#2f3a1a',
  lime: '#b9e04a',
  ink: '#16210e',
  muted: '#5f6a52',
  line: '#dfe4d2',
  soft: '#f6f8ef',
  button: '#4d6a14',
  orange: '#e8542b',
};

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

export const esc = (s: unknown): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export interface EmailOptions {
  brand?: string;
  /** Enlace al lead en el panel (https://…/portal/leads?open=ID) */
  panelUrl: string;
  receivedAt?: Date;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/* ── Piezas ──────────────────────────────────────────────────────────────── */

type Tone = 'call' | 'pack' | 'lead' | 'paid';
const TONES: Record<Tone, { bg: string; fg: string }> = {
  call: { bg: '#e6f2c2', fg: '#3b5a0a' },
  pack: { bg: '#ffe2d5', fg: '#a8360c' },
  lead: { bg: '#e9ecdf', fg: '#3d4a2b' },
  paid: { bg: '#d4f3dc', fg: '#116a2c' },
};

function button(href: string, label: string, primary: boolean): string {
  const bg = primary ? C.button : '#ffffff';
  const fg = primary ? '#ffffff' : C.button;
  const border = primary ? C.button : C.line;
  return `<a href="${esc(href)}" target="_blank" style="display:inline-block;background:${bg};color:${fg};border:1px solid ${border};border-radius:999px;padding:12px 20px;margin:0 8px 8px 0;font:700 14px/1 ${FONT};text-decoration:none;white-space:nowrap;">${esc(label)}</a>`;
}

function row(label: string, valueHtml: string): string {
  return `<tr>
    <td style="padding:9px 0;border-top:1px solid ${C.line};font:600 12px/1.4 ${FONT};letter-spacing:.06em;text-transform:uppercase;color:${C.muted};width:150px;vertical-align:top;">${esc(label)}</td>
    <td style="padding:9px 0;border-top:1px solid ${C.line};font:400 15px/1.5 ${FONT};color:${C.ink};vertical-align:top;">${valueHtml}</td>
  </tr>`;
}

function highlight(kicker: string, big: string, small: string, tone: Tone): string {
  const t = TONES[tone];
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 4px;"><tr>
    <td style="background:${t.bg};border-radius:14px;padding:18px 20px;">
      <div style="font:700 11px/1 ${FONT};letter-spacing:.14em;text-transform:uppercase;color:${t.fg};">${esc(kicker)}</div>
      <div style="font:800 24px/1.25 ${FONT};color:${C.ink};margin-top:8px;">${esc(big)}</div>
      ${small ? `<div style="font:400 14px/1.5 ${FONT};color:${C.muted};margin-top:2px;">${esc(small)}</div>` : ''}
    </td></tr></table>`;
}

function layout(o: {
  brand: string;
  preheader: string;
  badge: string;
  tone: Tone;
  title: string;
  subtitle?: string;
  highlightHtml?: string;
  buttons: string;
  panelUrl: string;
  rowsHtml: string;
  extraHtml?: string;
  receivedAt: Date;
}): string {
  const t = TONES[o.tone];
  const received = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid',
  }).format(o.receivedAt);

  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(o.title)}</title></head>
<body style="margin:0;padding:0;background:${C.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.page};">${esc(o.preheader)}&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page};"><tr><td align="center" style="padding:28px 12px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">
    <tr><td style="background:${C.head};border-radius:18px 18px 0 0;padding:20px 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="font:800 22px/1 ${FONT};letter-spacing:-.02em;color:#ffffff;">${esc(o.brand)}<span style="color:${C.lime};">.</span></td>
        <td align="right" style="font:600 11px/1 ${FONT};letter-spacing:.14em;text-transform:uppercase;color:${C.lime};">Aviso de ${o.tone === 'paid' ? 'compra' : 'lead'}</td>
      </tr></table>
    </td></tr>
    <tr><td style="background:${C.card};border-radius:0 0 18px 18px;padding:30px 28px 26px;">
      <span style="display:inline-block;background:${t.bg};color:${t.fg};border-radius:999px;padding:6px 12px;font:700 12px/1 ${FONT};letter-spacing:.04em;">${esc(o.badge)}</span>
      <h1 style="margin:14px 0 0;font:800 28px/1.15 ${FONT};letter-spacing:-.02em;color:${C.ink};">${esc(o.title)}</h1>
      ${o.subtitle ? `<p style="margin:6px 0 0;font:400 16px/1.4 ${FONT};color:${C.muted};">${esc(o.subtitle)}</p>` : ''}
      ${o.highlightHtml || ''}
      <div style="margin:20px 0 10px;">${o.buttons}</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">${o.rowsHtml}</table>
      ${o.extraHtml || ''}
    </td></tr>
    <tr><td style="padding:18px 8px 4px;text-align:center;font:400 12px/1.6 ${FONT};color:${C.muted};">
      Aviso automático de ${esc(o.brand)} · Recibido el ${esc(received)} (hora de Madrid)<br>
      Gestiona este y el resto de leads en tu <a href="${esc(o.panelUrl)}" style="color:${C.button};">panel</a>.
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

function messageBlock(title: string, text: string): string {
  return `<div style="margin-top:22px;">
    <div style="font:700 12px/1 ${FONT};letter-spacing:.06em;text-transform:uppercase;color:${C.muted};margin-bottom:8px;">${esc(title)}</div>
    <div style="background:${C.soft};border:1px solid ${C.line};border-radius:12px;padding:14px 16px;font:400 15px/1.6 ${FONT};color:${C.ink};">${esc(text).replace(/\n/g, '<br>')}</div>
  </div>`;
}

function chips(items: string[]): string {
  return items
    .map(
      (i) =>
        `<span style="display:inline-block;background:${C.soft};border:1px solid ${C.line};border-radius:999px;padding:4px 10px;margin:0 6px 6px 0;font:500 13px/1.2 ${FONT};color:${C.ink};">${esc(i)}</span>`
    )
    .join('');
}

const UTM_LABELS: Record<string, string> = {
  utm_source: 'Fuente',
  utm_medium: 'Medio',
  utm_campaign: 'Campaña',
  utm_content: 'Anuncio',
  utm_term: 'Término',
  fbclid: 'Click de Meta',
};

/* ── Lead ────────────────────────────────────────────────────────────────── */

export interface LeadMailData {
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  message: string;
  kind: 'call' | 'proposal';
  source: 'website' | 'landing' | 'stripe';
  callAt?: Date | null;
  answers?: { needs?: string[]; budget?: string; timeline?: string } | null;
  pack?: { website?: string; product?: string; runs_ads?: string } | null;
  utm?: Record<string, string> | null;
}

export function leadEmail(lead: LeadMailData, opts: EmailOptions): RenderedEmail {
  const brand = opts.brand || 'samgple';
  const receivedAt = opts.receivedAt || new Date();
  const isCall = lead.kind === 'call' && !!lead.callAt;
  const isPack = !!lead.pack;
  const who = lead.company ? `${lead.name} (${lead.company})` : lead.name;
  const when = isCall ? `${formatCallDate(lead.callAt!)} · ${formatCallTime(lead.callAt!)}` : '';

  const subject = isCall
    ? `Nueva llamada agendada — ${who} · ${when}`
    : isPack
      ? `Nuevo lead del Pack de Bienvenida — ${who}`
      : lead.source === 'landing'
        ? `Nuevo lead de la landing — ${who}`
        : `Nueva propuesta solicitada — ${who}`;

  const tone: Tone = isCall ? 'call' : isPack ? 'pack' : 'lead';
  const badge = isCall ? 'Llamada agendada' : isPack ? 'Pack de Bienvenida · 30 €' : lead.source === 'landing' ? 'Lead de la landing' : 'Propuesta desde la web';

  const preheader = isCall
    ? `${when} (hora de Madrid) · ${lead.phone || lead.email || 'sin contacto'}`
    : `${lead.phone || lead.email || 'Sin contacto'} · ${lead.message.replace(/\s+/g, ' ').slice(0, 90)}`;

  const highlightHtml = isCall
    ? highlight('Cuándo', formatCallDate(lead.callAt!, { withYear: true }), `${formatCallTime(lead.callAt!)} · hora de Madrid · 30 minutos`, 'call')
    : isPack
      ? highlight('Pedido', 'Pack de Bienvenida · 30 € (IVA incluido)', 'Ha rellenado el formulario y pasa al pago con Stripe. Si paga, te llega otro aviso de compra.', 'pack')
      : '';

  const digits = whatsappDigits(lead.phone);
  const buttons = [
    button(opts.panelUrl, 'Abrir en el panel', true),
    digits.length >= 8 ? button(`https://wa.me/${digits}`, 'Escribir por WhatsApp', false) : '',
    lead.email ? button(`mailto:${lead.email}`, 'Responder por email', false) : '',
  ].join('');

  const rows = [
    row('Nombre', `<strong>${esc(lead.name)}</strong>`),
    lead.phone ? row('Teléfono', `<a href="tel:${esc(lead.phone.replace(/[^\d+]/g, ''))}" style="color:${C.button};font-weight:700;text-decoration:none;">${esc(lead.phone)}</a>`) : '',
    lead.email ? row('Email', `<a href="mailto:${esc(lead.email)}" style="color:${C.button};text-decoration:none;">${esc(lead.email)}</a>`) : '',
    lead.company ? row('Empresa', esc(lead.company)) : '',
    lead.pack?.website ? row('Web o tienda', esc(lead.pack.website)) : '',
    lead.pack?.product ? row('Producto', esc(lead.pack.product)) : '',
    lead.pack?.runs_ads ? row('¿Hace anuncios?', esc(lead.pack.runs_ads)) : '',
    lead.answers?.needs?.length ? row('Necesita', chips(lead.answers.needs)) : '',
    lead.answers?.budget ? row('Presupuesto', esc(lead.answers.budget)) : '',
    lead.answers?.timeline ? row('Cuándo empezar', esc(lead.answers.timeline)) : '',
  ].join('');

  const utmEntries = Object.entries(lead.utm || {});
  const extra =
    (isPack ? '' : messageBlock(isCall ? 'Mensaje' : lead.source === 'landing' ? '¿Qué le interesa?' : 'Mensaje', lead.message)) +
    (utmEntries.length
      ? `<div style="margin-top:22px;font:400 13px/1.6 ${FONT};color:${C.muted};"><strong style="color:${C.ink};">Origen del anuncio:</strong> ${utmEntries
          .map(([k, v]) => `${esc(UTM_LABELS[k] || k)}: ${esc(v)}`)
          .join(' · ')}</div>`
      : '');

  const html = layout({
    brand,
    preheader,
    badge,
    tone,
    title: lead.name,
    subtitle: lead.company && lead.company !== lead.name ? lead.company : undefined,
    highlightHtml,
    buttons,
    panelUrl: opts.panelUrl,
    rowsHtml: rows,
    extraHtml: extra,
    receivedAt,
  });

  const text = [
    `${badge.toUpperCase()} — ${who}`,
    isCall ? `Llamada: ${formatCallDate(lead.callAt!, { withYear: true })} a las ${formatCallTime(lead.callAt!)} (hora de Madrid, 30 min)` : '',
    isPack ? 'Pedido: Pack de Bienvenida · 30 € (IVA incluido). Pasa al pago con Stripe.' : '',
    '',
    `Nombre: ${lead.name}`,
    lead.phone ? `Teléfono: ${lead.phone}` : '',
    lead.email ? `Email: ${lead.email}` : '',
    lead.company ? `Empresa: ${lead.company}` : '',
    lead.answers?.needs?.length ? `Necesita: ${lead.answers.needs.join(', ')}` : '',
    lead.answers?.budget ? `Presupuesto: ${lead.answers.budget}` : '',
    lead.answers?.timeline ? `Cuándo empezar: ${lead.answers.timeline}` : '',
    '',
    lead.message,
    utmEntries.length ? `\nOrigen del anuncio: ${utmEntries.map(([k, v]) => `${k}=${v}`).join(' · ')}` : '',
    '',
    digits.length >= 8 ? `WhatsApp: https://wa.me/${digits}` : '',
    `Panel: ${opts.panelUrl}`,
  ]
    .filter((l, i, arr) => l !== '' || (arr[i - 1] !== '' && i > 0))
    .join('\n');

  return { subject, html, text };
}

/* ── Compra ──────────────────────────────────────────────────────────────── */

export interface PurchaseMailData {
  packName: string;
  amountEur: number;
  monthly: boolean;
  livemode: boolean;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  stripeUrl?: string | null;
}

export function purchaseEmail(p: PurchaseMailData, opts: EmailOptions): RenderedEmail {
  const brand = opts.brand || 'samgple';
  const amount = `${p.amountEur.toLocaleString('es-ES')} €`;
  const title = p.customerName || p.customerEmail || 'Cliente de Stripe';
  const subject = `Nueva compra — ${p.packName} · ${amount} (IVA incluido)${p.livemode ? '' : ' [prueba]'}`;

  const digits = whatsappDigits(p.customerPhone);
  const buttons = [
    button(opts.panelUrl, 'Abrir en el panel', true),
    p.stripeUrl ? button(p.stripeUrl, 'Ver el pago en Stripe', false) : '',
    digits.length >= 8 ? button(`https://wa.me/${digits}`, 'Escribir por WhatsApp', false) : '',
    p.customerEmail ? button(`mailto:${p.customerEmail}`, 'Escribir por email', false) : '',
  ].join('');

  const html = layout({
    brand,
    preheader: `${amount} (IVA incluido) · ${p.packName}`,
    badge: p.livemode ? 'Compra pagada' : 'Compra de prueba',
    tone: 'paid',
    title,
    subtitle: 'Ha pagado en Stripe',
    highlightHtml: highlight('Pagado', `${amount}${p.monthly ? ' al mes' : ''}`, `${p.packName} · IVA incluido`, 'paid'),
    buttons,
    panelUrl: opts.panelUrl,
    rowsHtml: [
      row('Pack', `<strong>${esc(p.packName)}</strong>`),
      row('Importe', `${esc(amount)}${p.monthly ? ' al mes' : ''} (IVA incluido)`),
      p.customerName ? row('Cliente', esc(p.customerName)) : '',
      p.customerEmail ? row('Email', `<a href="mailto:${esc(p.customerEmail)}" style="color:${C.button};text-decoration:none;">${esc(p.customerEmail)}</a>`) : '',
      p.customerPhone ? row('Teléfono', esc(p.customerPhone)) : '',
    ].join(''),
    extraHtml: `<div style="margin-top:22px;font:400 13px/1.6 ${FONT};color:${C.muted};">Ya está guardada en Solicitudes como <strong style="color:${C.ink};">Ganada</strong>. Stripe le envía el recibo y la factura.${p.livemode ? '' : ' Es un pago de prueba: no se ha cobrado dinero real.'}</div>`,
    receivedAt: opts.receivedAt || new Date(),
  });

  const text = [
    `COMPRA PAGADA — ${p.packName} · ${amount}${p.monthly ? ' al mes' : ''} (IVA incluido)${p.livemode ? '' : ' [prueba]'}`,
    '',
    p.customerName ? `Cliente: ${p.customerName}` : '',
    p.customerEmail ? `Email: ${p.customerEmail}` : '',
    p.customerPhone ? `Teléfono: ${p.customerPhone}` : '',
    '',
    `Panel: ${opts.panelUrl}`,
    p.stripeUrl ? `Stripe: ${p.stripeUrl}` : '',
  ]
    .filter((l, i, arr) => l !== '' || (arr[i - 1] !== '' && i > 0))
    .join('\n');

  return { subject, html, text };
}

/* ── Invitación al equipo ────────────────────────────────────────────────── */

export interface TeamInviteData {
  ownerName: string;
  role: string;
  inviteUrl: string;
  brand?: string;
}

const ROLE_LABEL: Record<string, string> = { admin: 'administrador', manager: 'gestor', member: 'miembro' };

export function teamInviteEmail(d: TeamInviteData): RenderedEmail {
  const brand = d.brand || 'samgple';
  const role = ROLE_LABEL[d.role] || ROLE_LABEL.member;
  const subject = `${d.ownerName} te ha invitado al equipo de ${brand}`;

  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${C.page};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page};"><tr><td align="center" style="padding:28px 12px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">
    <tr><td style="background:${C.head};border-radius:18px 18px 0 0;padding:20px 28px;font:800 22px/1 ${FONT};letter-spacing:-.02em;color:#ffffff;">${esc(brand)}<span style="color:${C.lime};">.</span></td></tr>
    <tr><td style="background:${C.card};border-radius:0 0 18px 18px;padding:30px 28px 26px;">
      <h1 style="margin:0;font:800 26px/1.15 ${FONT};letter-spacing:-.02em;color:${C.ink};">Te han invitado al equipo</h1>
      <p style="margin:12px 0 0;font:400 16px/1.5 ${FONT};color:${C.muted};"><strong style="color:${C.ink};">${esc(d.ownerName)}</strong> te ha invitado a unirte al panel de ${esc(brand)} como <strong style="color:${C.ink};">${esc(role)}</strong>.</p>
      <div style="margin:24px 0 10px;">${button(d.inviteUrl, 'Aceptar la invitación', true)}</div>
      <p style="margin:18px 0 0;font:400 13px/1.6 ${FONT};color:${C.muted};">Si el botón no funciona, copia este enlace en tu navegador:<br><a href="${esc(d.inviteUrl)}" style="color:${C.button};word-break:break-all;">${esc(d.inviteUrl)}</a></p>
      <p style="margin:18px 0 0;font:400 13px/1.6 ${FONT};color:${C.muted};">Si no esperabas este correo, puedes ignorarlo: no se crea ninguna cuenta hasta que aceptes.</p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;

  const text = [
    `${d.ownerName} te ha invitado al equipo de ${brand} como ${role}.`,
    '',
    `Acepta la invitación aquí: ${d.inviteUrl}`,
    '',
    'Si no esperabas este correo, puedes ignorarlo.',
  ].join('\n');

  return { subject, html, text };
}
