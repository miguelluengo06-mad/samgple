import { afterEach, describe, expect, it } from 'vitest';
import { RULES, detectAttack, getClientIp, isAllowlisted, isValidIp, reportSuspicious } from '../security';

afterEach(() => {
  delete process.env.SECURITY_ALLOWLIST_IPS;
});

describe('detectAttack', () => {
  it('flags scanner paths', () => {
    for (const p of ['/wp-login.php', '/wp-admin/setup.php', '/.env', '/.git/config', '/phpmyadmin/', '/xmlrpc.php', '/cgi-bin/test', '/backup.sql', '/shell.php']) {
      expect(detectAttack(p, '')?.kind, p).toBe('attack_path');
    }
  });

  it('flags injection and traversal payloads', () => {
    expect(detectAttack('/landing', '?x=../../etc/passwd')?.kind).toBe('attack_payload');
    expect(detectAttack('/landing', '?q=<script>alert(1)</script>')?.kind).toBe('attack_payload');
    expect(detectAttack('/landing', "?id=1 UNION SELECT password FROM users")?.kind).toBe('attack_payload');
    expect(detectAttack('/landing', "?id=' or 1=1 --")?.kind).toBe('attack_payload');
    expect(detectAttack('/landing', '?x=${jndi:ldap://evil/a}')?.kind).toBe('attack_payload');
    expect(detectAttack('/landing', '?x=%2e%2e%2fsecret')?.kind).toBe('attack_payload');
    expect(detectAttack('/landing', '?x=%E0%A4%A')?.kind).toBe('attack_payload');
  });

  it('lets normal traffic through', () => {
    for (const [p, q] of [
      ['/', ''],
      ['/landing', '?utm_source=facebook&utm_campaign=otoño&fbclid=IwAR0abc'],
      ['/portal/leads', '?open=3f2b8c1e-6a4d-4e0b-9a41-2c8f0b7d5e11'],
      ['/api/public/contact', ''],
      ['/auth/callback', '?code=abc123&next=/portal'],
      ['/gracias', '?session_id=cs_live_a1B2c3'],
      ['/carrito', '?pago=cancelado'],
    ]) {
      expect(detectAttack(p, q), `${p}${q}`).toBeNull();
    }
  });
});

describe('ip helpers', () => {
  it('validates IPv4 and IPv6', () => {
    expect(isValidIp('203.0.113.7')).toBe(true);
    expect(isValidIp('2001:db8::1')).toBe(true);
    expect(isValidIp('999.1.1.1')).toBe(false);
    expect(isValidIp("1.1.1.1'; drop table")).toBe(false);
    expect(isValidIp('')).toBe(false);
  });

  it('takes the platform IP header, never a malformed one', () => {
    expect(getClientIp(new Headers({ 'x-real-ip': '203.0.113.7' }))).toBe('203.0.113.7');
    expect(getClientIp(new Headers({ 'x-forwarded-for': '198.51.100.9, 10.0.0.1' }))).toBe('198.51.100.9');
    expect(getClientIp(new Headers({ 'x-forwarded-for': 'evil<script>' }))).toBe('unknown');
    expect(getClientIp(new Headers())).toBe('unknown');
  });

  it('never blocks allow-listed IPs', async () => {
    process.env.SECURITY_ALLOWLIST_IPS = '203.0.113.7, 198.51.100.9';
    expect(isAllowlisted('198.51.100.9')).toBe(true);
    expect(isAllowlisted('1.2.3.4')).toBe(false);
    expect(await reportSuspicious({ ip: '203.0.113.7', kind: 'attack_path' })).toBe(false);
  });
});

describe('block rules', () => {
  it('blocks scanners at once and password guessers after 6 failures', () => {
    expect(RULES.attack_path.max).toBe(1);
    expect(RULES.attack_payload.max).toBe(1);
    expect(RULES.login_failed.max).toBe(6);
    expect(RULES.login_failed.blockMs).toBe(24 * 3600_000);
    expect(RULES.forbidden.max).toBeLessThanOrEqual(3);
  });
});

describe('trusted IPs', () => {
  it('never reports or blocks a trusted (allow-listed) IP, even for an attack', async () => {
    process.env.SECURITY_ALLOWLIST_IPS = '203.0.113.50';
    expect(await reportSuspicious({ ip: '203.0.113.50', kind: 'login_failed', detail: 'a@b.c' })).toBe(false);
    expect(await reportSuspicious({ ip: '203.0.113.50', kind: 'attack_payload' })).toBe(false);
  });
});
