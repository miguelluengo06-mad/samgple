import { describe, it, expect } from 'vitest';
import {
  zonedTimeToUtc,
  todayInBookingTz,
  getBookableDays,
  getSlotsForDay,
  validateSlot,
  sanitizeAnswers,
  buildIcs,
  SLOT_TIMES,
  MIN_LEAD_HOURS,
  BOOKING_DAYS_AHEAD,
} from '../booking';

describe('zonedTimeToUtc', () => {
  it('uses UTC+2 in summer and UTC+1 in winter (Europe/Madrid)', () => {
    expect(zonedTimeToUtc('2026-10-01', '10:00').toISOString()).toBe('2026-10-01T08:00:00.000Z');
    expect(zonedTimeToUtc('2026-12-01', '10:00').toISOString()).toBe('2026-12-01T09:00:00.000Z');
  });

  it('handles the day after the autumn DST change', () => {
    // DST ended Sunday 2026-10-25, so Monday is already UTC+1
    expect(zonedTimeToUtc('2026-10-26', '10:00').toISOString()).toBe('2026-10-26T09:00:00.000Z');
  });
});

describe('todayInBookingTz', () => {
  it('rolls over at Madrid midnight, not UTC midnight', () => {
    // 23:30 UTC on Sep 30 is already 01:30 on Oct 1 in Madrid (UTC+2)
    expect(todayInBookingTz(new Date('2026-09-30T23:30:00Z'))).toBe('2026-10-01');
    expect(todayInBookingTz(new Date('2026-09-30T21:30:00Z'))).toBe('2026-09-30');
  });
});

describe('getSlotsForDay', () => {
  const now = new Date('2026-09-24T07:00:00Z'); // Thursday 09:00 Madrid

  it('has no slots on weekends', () => {
    expect(getSlotsForDay('2026-09-26', now)).toEqual([]); // Saturday
    expect(getSlotsForDay('2026-09-27', now)).toEqual([]); // Sunday
  });

  it('respects the minimum lead time on the same day', () => {
    const slots = getSlotsForDay('2026-09-24', now);
    // 09:00 Madrid + 3h => earliest 12:00
    expect(slots).toEqual(['12:00', '13:00', '16:00', '17:00', '18:00']);
    expect(MIN_LEAD_HOURS).toBe(3);
  });

  it('offers every slot on a later weekday', () => {
    expect(getSlotsForDay('2026-09-28', now)).toEqual(SLOT_TIMES);
  });
});

describe('getBookableDays', () => {
  it('only lists weekdays within the booking window', () => {
    const now = new Date('2026-09-24T07:00:00Z');
    const days = getBookableDays(now);
    expect(days[0]).toBe('2026-09-24');
    expect(days.every((d) => {
      const dow = new Date(`${d}T00:00:00Z`).getUTCDay();
      return dow >= 1 && dow <= 5;
    })).toBe(true);
    expect(days[days.length - 1] <= '2026-10-15').toBe(true);
    expect(BOOKING_DAYS_AHEAD).toBe(21);
  });

  it('skips today when every slot is already past', () => {
    const late = new Date('2026-09-24T18:00:00Z'); // 20:00 Madrid
    expect(getBookableDays(late)[0]).toBe('2026-09-25');
  });
});

describe('validateSlot', () => {
  const now = new Date('2026-09-24T07:00:00Z');

  it('accepts a valid future slot and returns the UTC instant', () => {
    const res = validateSlot('2026-09-28', '11:00', now);
    expect(res.ok).toBe(true);
    expect(res.at?.toISOString()).toBe('2026-09-28T09:00:00.000Z');
  });

  it.each([
    ['malformed date', '28/09/2026', '11:00'],
    ['time outside the offered slots', '2026-09-28', '11:30'],
    ['weekend', '2026-09-26', '11:00'],
    ['past slot', '2026-09-23', '11:00'],
    ['too soon', '2026-09-24', '10:00'],
    ['beyond the window', '2026-12-01', '11:00'],
    ['non-string input', 123, '11:00'],
  ])('rejects %s', (_label, date, time) => {
    expect(validateSlot(date as any, time as any, now).ok).toBe(false);
  });
});

describe('sanitizeAnswers', () => {
  it('drops anything that is not one of the offered options', () => {
    expect(
      sanitizeAnswers({ needs: ['Vídeo', 'Vídeo', '<script>'], budget: 'lo que sea', timeline: 'Lo antes posible' })
    ).toEqual({ needs: ['Vídeo'], budget: '', timeline: 'Lo antes posible' });
  });

  it('copes with missing input', () => {
    expect(sanitizeAnswers(undefined)).toEqual({ needs: [], budget: '', timeline: '' });
  });
});

describe('buildIcs', () => {
  it('produces a 30 minute event with escaped text', () => {
    const ics = buildIcs({
      uid: 'abc@test',
      start: new Date('2026-09-28T09:00:00Z'),
      title: 'Llamada, con; equipo',
    });
    expect(ics).toContain('DTSTART:20260928T090000Z');
    expect(ics).toContain('DTEND:20260928T093000Z');
    expect(ics).toContain('SUMMARY:Llamada\\, con\\; equipo');
    expect(ics.startsWith('BEGIN:VCALENDAR')).toBe(true);
  });
});
