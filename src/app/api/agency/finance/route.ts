import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAgencyPrincipal } from '@/lib/agencyAccess';
import { getAgencyStripe } from '@/lib/packCheckout';
import { buildMonths, byPack, type FinanceInvoice, type FinanceRefund } from '@/lib/finance';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MONTHS = 12;
const MAX_INVOICES = 2000;
const CACHE_MS = 60_000;
let cache: { at: number; body: unknown } | null = null;

// GET /api/agency/finance - monthly revenue for the agency, read straight from Stripe
// (paid invoices incl. subscription renewals, VAT and refunds).
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const forbidden = await requireAgencyPrincipal(supabaseAdmin, user.id);
  if (forbidden) return forbidden;

  if (cache && Date.now() - cache.at < CACHE_MS) return NextResponse.json(cache.body);

  const agency = await getAgencyStripe();
  if (!agency) return NextResponse.json({ connected: false });

  try {
    const now = Math.floor(Date.now() / 1000);
    const since = now - 400 * 24 * 60 * 60; // un poco más de 12 meses; buildMonths recorta por mes natural
    const invoices: FinanceInvoice[] = [];
    let truncated = false;

    for await (const inv of agency.stripe.invoices.list({ status: 'paid', created: { gte: since }, limit: 100 })) {
      if (invoices.length >= MAX_INVOICES) {
        truncated = true;
        break;
      }
      const tax = (inv.total_taxes || []).reduce((s, t) => s + (t.amount || 0), 0);
      invoices.push({
        paidAt: inv.status_transitions?.paid_at || inv.created,
        total: inv.total,
        tax,
        packName: inv.metadata?.pack_name || inv.lines?.data?.[0]?.description || '',
        lines: (inv.lines?.data || []).map((l) => ({ name: l.description || '', gross: l.amount })),
      });
    }

    const refunds: FinanceRefund[] = [];
    for await (const r of agency.stripe.refunds.list({ created: { gte: since }, limit: 100 })) {
      if (r.status === 'succeeded') refunds.push({ created: r.created, amount: r.amount });
    }

    let mrr = 0;
    let activeSubscriptions = 0;
    for await (const sub of agency.stripe.subscriptions.list({ status: 'active', limit: 100 })) {
      activeSubscriptions += 1;
      for (const item of sub.items.data) {
        if (item.price.recurring?.interval === 'month') mrr += (item.price.unit_amount || 0) * (item.quantity || 1);
        else if (item.price.recurring?.interval === 'year') mrr += Math.round(((item.price.unit_amount || 0) * (item.quantity || 1)) / 12);
      }
    }

    const body = {
      connected: true,
      livemode: agency.livemode,
      currency: 'eur',
      months: buildMonths(invoices, refunds, now, MONTHS),
      packs: byPack(invoices.filter((i) => i.paidAt >= now - 365 * 24 * 60 * 60)).slice(0, 8),
      mrr,
      activeSubscriptions,
      truncated,
    };
    cache = { at: Date.now(), body };
    return NextResponse.json(body);
  } catch (err: any) {
    console.error('Finance: Stripe read failed:', err?.message);
    return NextResponse.json({ error: 'No se pudieron leer los datos de Stripe. Comprueba la clave (permisos de lectura de facturas y reembolsos).' }, { status: 502 });
  }
}
