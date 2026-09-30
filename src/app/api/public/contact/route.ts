import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { checkRateLimit, isValidEmail, sanitizeString } from '@/lib/validation';
import { resolveLeadMailer, sendLeadMail } from '@/lib/leadMailer';
import { leadEmail } from '@/lib/emailTemplates';
import { VAT_LABEL, WELCOME_PACK, welcomeSpots } from '@/lib/packs';
import { validateSlot, sanitizeAnswers } from '@/lib/booking';

const PHONE_RE = /^[+()\d\s.-]{6,25}$/;

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'];

/** Ad attribution captured by the landing: keep only known keys, short strings. */
function sanitizeUtm(input: any): Record<string, string> | null {
  if (!input || typeof input !== 'object') return null;
  const out: Record<string, string> = {};
  for (const key of UTM_KEYS) {
    const value = input[key];
    if (typeof value === 'string' && value.trim()) out[key] = sanitizeString(value, 200);
  }
  return Object.keys(out).length ? out : null;
}

// POST /api/public/contact - request from the public site (no auth).
//   kind "call"     → a booked call: date + time slot, phone and answers to the pre-call questions
//   kind "proposal" → free-text proposal request (default when no kind is sent)
//   source "landing" → the ads landing form: WhatsApp + name (+ business/interest); email is optional
//                      and ad attribution (utm_*, fbclid) is stored with the lead
// Always persisted as a lead first, so nothing is lost even if SMTP isn't configured.
// Email notification to the agency is best-effort on top of that.
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitResult = checkRateLimit(`contact:${ip}`, 5, 60 * 1000);
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Demasiados intentos. Espera un momento.' }, { status: 429 });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const kind: 'call' | 'proposal' = body.kind === 'call' ? 'call' : 'proposal';
    const source: 'website' | 'landing' = body.source === 'landing' ? 'landing' : 'website';

    // Honeypot: real people never see or fill this field. Pretend success so bots don't retry.
    if (typeof body.website === 'string' && body.website.trim() !== '') {
      return NextResponse.json({ success: true });
    }

    const name = sanitizeString(body.name || '', 200);
    const email = (body.email || '').trim();
    const company = sanitizeString(body.company || '', 200);
    const phone = sanitizeString(body.phone || '', 25);
    let message = sanitizeString(body.message || '', 4000);

    if (!name) {
      return NextResponse.json({ error: 'Dinos tu nombre' }, { status: 400 });
    }
    // Landing leads come from WhatsApp-first ad traffic: the email is optional there (but must be valid if given)
    const emailOptional = source === 'landing' && kind === 'proposal';
    if (email ? !isValidEmail(email) : !emailOptional) {
      return NextResponse.json({ error: 'Introduce un email válido' }, { status: 400 });
    }

    let pack: { id: string; website: string; product: string; runs_ads: string } | null = null;
    let callAt: Date | null = null;
    let answers: ReturnType<typeof sanitizeAnswers> | null = null;

    if (kind === 'call') {
      if (!phone || !PHONE_RE.test(phone)) {
        return NextResponse.json({ error: 'Introduce un teléfono válido' }, { status: 400 });
      }
      const slot = validateSlot(body.date, body.time);
      if (!slot.ok || !slot.at) {
        return NextResponse.json({ error: slot.error || 'Elige un día y una hora válidos' }, { status: 400 });
      }
      callAt = slot.at;
      answers = sanitizeAnswers(body.answers);
      // The extra comment is optional for calls; the column is NOT NULL, so keep a readable placeholder.
      if (!message) message = 'Sin comentarios adicionales.';
    } else if (source === 'landing') {
      // Landing form: the phone is the way to reach them; "¿Qué te interesa?" is optional
      if (!phone || !PHONE_RE.test(phone)) {
        return NextResponse.json({ error: 'Introduce un WhatsApp válido' }, { status: 400 });
      }
      if (body.pack === 'welcome') {
        // Pack de Bienvenida: short qualification form (empresa = name, web/tienda, producto, ¿anuncios?)
        if (welcomeSpots().soldOut) {
          return NextResponse.json({ error: 'Las plazas del Pack de Bienvenida se han agotado.' }, { status: 409 });
        }
        const website = sanitizeString(body.packData?.website || '', 300);
        const product = sanitizeString(body.packData?.product || '', 300);
        const runsAds = body.packData?.runsAds === 'Sí' ? 'Sí' : body.packData?.runsAds === 'No' ? 'No' : '';
        if (!website || !product || !runsAds) {
          return NextResponse.json({ error: 'Completa todos los campos del formulario' }, { status: 400 });
        }
        pack = { id: 'welcome', website, product, runs_ads: runsAds };
        message = [
          `${WELCOME_PACK.name} (${WELCOME_PACK.price} € ${VAT_LABEL})`,
          `Web o tienda: ${website}`,
          `Producto a promocionar: ${product}`,
          `¿Ya hace anuncios en redes?: ${runsAds}`,
        ].join('\n');
      }
      if (!message) message = 'Sin comentarios adicionales.';
    } else if (!message) {
      return NextResponse.json({ error: 'Cuéntanos qué necesitas' }, { status: 400 });
    }

    // Self-hosted deployments serve a single agency — the earliest-created
    // profile is the owner (matches /api/public/branding and /api/public/checkout).
    const { data: owner } = await supabaseAdmin
      .from('profiles')
      .select('id, business_name')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!owner) {
      console.error('Contact form: no agency profile found to attach the lead to');
      return NextResponse.json({ error: 'Las reservas no están disponibles todavía' }, { status: 503 });
    }

    const utm = source === 'landing' ? sanitizeUtm(body.utm) : null;

    const { data: lead, error: insertError } = await supabaseAdmin
      .from('leads')
      .insert({
        owner_id: owner.id,
        name,
        email,
        company: company || null,
        phone: phone || null,
        message,
        source,
        kind,
        call_at: callAt ? callAt.toISOString() : null,
        answers:
          answers ??
          (source === 'landing' && (utm || pack) ? { ...(pack ? { pack } : {}), ...(utm ? { utm } : {}) } : null),
      })
      .select('id')
      .single();

    if (insertError) {
      // uq_leads_call_slot: someone else took this slot between the availability check and now.
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'Esa franja acaba de reservarse. Elige otra.' }, { status: 409 });
      }
      console.error('Contact form: failed to save lead:', insertError);
      return NextResponse.json({ error: 'No se pudo enviar. Inténtalo de nuevo.' }, { status: 500 });
    }

    // Best-effort email notification — the lead is already saved regardless of this.
    const mailer = await resolveLeadMailer(supabaseAdmin, owner.id).catch(() => null);

    if (mailer) {
      try {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
        const mail = leadEmail(
          { name, email: email || null, phone: phone || null, company: company || null, message, kind, source, callAt, answers, pack, utm },
          {
            brand: owner.business_name || undefined,
            panelUrl: `${siteUrl}/portal/${callAt ? 'calls' : 'leads'}${lead?.id ? `?open=${lead.id}` : ''}`,
          }
        );
        await sendLeadMail(mailer, { ...mail, replyTo: email || undefined, idempotencyKey: lead?.id ? `lead-${lead.id}` : undefined });
      } catch (emailError) {
        console.error('Contact form: lead saved but email notification failed:', emailError);
      }
    } else {
      console.warn('Contact form: no email configured (RESEND_API_KEY, Ajustes → Conexiones, or N8N_SMTP_* env vars) — lead saved, no email sent.');
    }

    return NextResponse.json({ success: true, id: lead?.id, callAt: callAt ? callAt.toISOString() : null });
  } catch (error: any) {
    console.error('Contact form error:', error);
    return NextResponse.json({ error: 'No se pudo enviar. Inténtalo de nuevo.' }, { status: 500 });
  }
}
