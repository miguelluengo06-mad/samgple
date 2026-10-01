import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAgencyStripe } from '@/lib/packCheckout';

export const dynamic = 'force-dynamic';

// GET /api/account/purchases - the signed-in customer's own paid orders, matched by (confirmed) email.
// Narrow projection on purpose: internal notes and other agency-only columns never leave this route.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Without a confirmed email anyone could claim someone else's purchases by registering with their address.
  if (!user.email || !user.email_confirmed_at) return NextResponse.json({ purchases: [] });

  const pattern = user.email.replace(/[\\%_]/g, (c) => `\\${c}`);
  const { data, error: queryError } = await supabaseAdmin
    .from('leads')
    .select('id, answers, created_at')
    .ilike('email', pattern)
    .not('answers->order', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50);

  if (queryError) {
    console.error('Account purchases fetch error:', queryError);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }

  const orders = (data || []).map((l: any) => ({ id: l.id, order: l.answers?.order || {} }));

  // Link to the Stripe invoice/receipt (best-effort: the list works even if Stripe is unreachable)
  const agency = orders.some((o) => o.order.invoice_id) ? await getAgencyStripe().catch(() => null) : null;
  const purchases = await Promise.all(
    orders.map(async ({ id, order }) => {
      let invoiceUrl: string | null = null;
      if (agency && order.invoice_id && order.livemode === agency.livemode) {
        try {
          const inv = await agency.stripe.invoices.retrieve(order.invoice_id);
          invoiceUrl = inv.hosted_invoice_url || null;
        } catch {
          /* invoice not available */
        }
      }
      return {
        id,
        pack_name: String(order.pack_name || ''),
        items: Array.isArray(order.items)
          ? order.items.map((it: any) => ({ name: String(it.name || ''), qty: Number(it.qty) || 1, total_eur: Number(it.total_eur) || 0 }))
          : [],
        amount_eur: Number(order.amount_eur) || 0,
        monthly: order.mode === 'subscription',
        paid_at: order.paid_at || null,
        invoice_url: invoiceUrl,
      };
    })
  );

  return NextResponse.json({ purchases });
}
