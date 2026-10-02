import type { SupabaseClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { decrypt } from '@/lib/encryption';

export interface LeadMailer {
  /** 'resend' = API de Resend (RESEND_API_KEY); 'smtp' = nodemailer con el SMTP del panel o de las variables SMTP_* */
  provider: 'resend' | 'smtp';
  /** nodemailer.createTransport options (solo con provider 'smtp') */
  transport: { host: string; port: number; secure: boolean; auth: { user: string; pass: string } };
  /** API key de Resend (solo con provider 'resend') */
  resendApiKey?: string;
  from: string;
  /** Where the "new lead" notification goes (varias direcciones separadas por comas) */
  to: string;
  /** 'panel' = SMTP configured in Ajustes → Pagos y email; 'env' = variables de entorno */
  origin: 'panel' | 'env';
}

const RESEND_TEST_SENDER = 'onboarding@resend.dev';

/**
 * Works out how to email the agency about a new lead, or null when nothing is configured
 * (the lead is saved regardless — the email is only a convenience).
 *
 *  1. Resend, if RESEND_API_KEY is set. From: RESEND_FROM (must be on a domain verified in Resend;
 *     without it the Resend test sender is used, which only delivers to the Resend account owner).
 *     To: LEAD_NOTIFY_EMAIL, or the owner's account email, or ADMIN_EMAIL.
 *  2. The SMTP the owner saved in the panel (profiles.agency_smtp_*, password encrypted at rest),
 *     notifying the owner's own account email.
 *  3. Otherwise the SMTP_* / ADMIN_EMAIL environment variables.
 */
export async function resolveLeadMailer(supabase: SupabaseClient, ownerId: string): Promise<LeadMailer | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, agency_smtp_host, agency_smtp_port, agency_smtp_user, agency_smtp_sender, agency_smtp_pass_encrypted, agency_smtp_enabled')
    .eq('id', ownerId)
    .maybeSingle();

  const resendKey = process.env.RESEND_API_KEY?.trim();
  const resendTo = process.env.LEAD_NOTIFY_EMAIL?.trim() || profile?.email || process.env.ADMIN_EMAIL;
  if (resendKey && resendTo) {
    return {
      provider: 'resend',
      origin: 'env',
      transport: { host: 'api.resend.com', port: 443, secure: true, auth: { user: 'resend', pass: resendKey } },
      resendApiKey: resendKey,
      from: process.env.RESEND_FROM?.trim() || `samgple <${RESEND_TEST_SENDER}>`,
      to: resendTo,
    };
  }

  if (
    profile?.agency_smtp_enabled &&
    profile.agency_smtp_host &&
    profile.agency_smtp_user &&
    profile.agency_smtp_pass_encrypted &&
    profile.email
  ) {
    try {
      const port = Number(profile.agency_smtp_port) || 587;
      return {
        provider: 'smtp',
        origin: 'panel',
        transport: {
          host: profile.agency_smtp_host,
          port,
          secure: port === 465,
          auth: { user: profile.agency_smtp_user, pass: decrypt(profile.agency_smtp_pass_encrypted) },
        },
        from: profile.agency_smtp_sender || profile.agency_smtp_user,
        to: profile.email,
      };
    } catch (err) {
      // Wrong ENCRYPTION_SECRET or corrupted value: fall through to the env configuration
      console.error('Lead mailer: could not decrypt the panel SMTP password:', err);
    }
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (adminEmail && smtpUser && smtpPass) {
    const port = parseInt(process.env.SMTP_PORT || '587');
    return {
      provider: 'smtp',
      origin: 'env',
      transport: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port,
        secure: port === 465,
        auth: { user: smtpUser, pass: smtpPass },
      },
      from: process.env.SMTP_SENDER || process.env.SMTP_FROM || smtpUser,
      to: adminEmail,
    };
  }

  return null;
}

export interface LeadMailMessage {
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  /** Evita duplicados si se reintenta el mismo aviso (solo Resend) */
  idempotencyKey?: string;
}

/** Sends one notification with whichever provider was resolved. Throws on failure (callers treat it as best-effort). */
export async function sendLeadMail(mailer: LeadMailer, msg: LeadMailMessage): Promise<void> {
  if (mailer.provider === 'resend') {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mailer.resendApiKey}`,
        'Content-Type': 'application/json',
        ...(msg.idempotencyKey ? { 'Idempotency-Key': msg.idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from: mailer.from,
        to: mailer.to.split(',').map((a) => a.trim()).filter(Boolean),
        subject: msg.subject,
        html: msg.html,
        ...(msg.text ? { text: msg.text } : {}),
        ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
      }),
    });
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      throw new Error(`Resend ${res.status}: ${detail?.message || detail?.name || 'error desconocido'}`);
    }
    return;
  }

  await nodemailer.createTransport(mailer.transport).sendMail({
    from: mailer.from,
    to: mailer.to,
    ...(msg.replyTo ? { replyTo: msg.replyTo } : {}),
    subject: msg.subject,
    html: msg.html,
    ...(msg.text ? { text: msg.text } : {}),
  });
}
