import { describe, expect, it } from 'vitest';
import { filterAnalyticsEvent } from '../analyticsFilter';

const ev = (url: string) => ({ type: 'pageview' as const, url });

describe('analytics filter', () => {
  it('counts public pages and keeps only the path (no query, no hash)', () => {
    expect(filterAnalyticsEvent(ev('https://samgple.com/landing?utm_source=facebook&fbclid=abc#pack'))?.url).toBe('https://samgple.com/landing');
    expect(filterAnalyticsEvent(ev('https://samgple.com/gracias?session_id=cs_live_123'))?.url).toBe('https://samgple.com/gracias');
    expect(filterAnalyticsEvent(ev('https://samgple.com/'))?.url).toBe('https://samgple.com/');
    expect(filterAnalyticsEvent(ev('https://samgple.com/cuenta/videos'))?.url).toBe('https://samgple.com/cuenta/videos');
  });

  it('keeps the rest of the event untouched', () => {
    expect(filterAnalyticsEvent({ type: 'event' as const, url: 'https://samgple.com/carrito?x=1', name: 'x' })).toEqual({ type: 'event', url: 'https://samgple.com/carrito', name: 'x' });
  });

  it('never reports the admin panel, previews or access links', () => {
    for (const path of ['/portal', '/portal/leads?open=3f2b', '/vista-cliente?lead=1', '/auth/confirm?token_hash=abc', '/auth/set-password', '/invite/accept-team?token=t']) {
      expect(filterAnalyticsEvent(ev(`https://samgple.com${path}`)), path).toBeNull();
    }
  });

  it('drops events it cannot understand', () => {
    expect(filterAnalyticsEvent(ev('no es una url'))).toBeNull();
  });
});
