import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { checkRateLimit } from '@/lib/validation';
import { SLOT_TIMES, getSlotsForDay, zonedTimeToUtc, validateSlot } from '@/lib/booking';

export const dynamic = 'force-dynamic';

// GET /api/public/availability?date=YYYY-MM-DD
// Returns every slot of that day with whether it can still be booked.
export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  if (!checkRateLimit(`availability:${ip}`, 60, 60 * 1000).allowed) {
    return NextResponse.json({ error: 'Demasiadas peticiones' }, { status: 429 });
  }

  const date = req.nextUrl.searchParams.get('date') || '';
  const reachable = getSlotsForDay(date);
  // Reuse the booking validation so this endpoint can never disagree with the POST about the window.
  const inWindow = reachable.filter((t) => validateSlot(date, t).ok);

  const { data: owner } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  const taken = new Set<number>();
  if (owner && inWindow.length > 0) {
    const { data: booked } = await supabaseAdmin
      .from('leads')
      .select('call_at')
      .eq('owner_id', owner.id)
      .eq('kind', 'call')
      .neq('status', 'lost')
      .gte('call_at', zonedTimeToUtc(date, '00:00').toISOString())
      .lte('call_at', zonedTimeToUtc(date, '23:59').toISOString());
    for (const row of booked || []) {
      if (row.call_at) taken.add(new Date(row.call_at).getTime());
    }
  }

  const slots = SLOT_TIMES.map((time) => ({
    time,
    available: inWindow.includes(time) && !taken.has(zonedTimeToUtc(date, time).getTime()),
  }));

  return NextResponse.json({ date, slots }, { headers: { 'Cache-Control': 'no-store' } });
}
