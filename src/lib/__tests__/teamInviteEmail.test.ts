import { describe, expect, it } from 'vitest';
import { teamInviteEmail } from '../emailTemplates';

describe('teamInviteEmail', () => {
  it('is in Spanish, carries the invite link and the role', () => {
    const m = teamInviteEmail({ ownerName: 'Miguel', role: 'admin', inviteUrl: 'https://samgple.com/invite/accept-team?token=tm_abc' });
    expect(m.subject).toBe('Miguel te ha invitado al equipo de samgple');
    expect(m.html).toContain('administrador');
    expect(m.html).toContain('https://samgple.com/invite/accept-team?token=tm_abc');
    expect(m.text).toContain('tm_abc');
    expect(m.html + m.text).not.toMatch(/Join Team/i);
  });

  it('escapes what the owner typed', () => {
    const m = teamInviteEmail({ ownerName: '<script>alert(1)</script>', role: 'member', inviteUrl: 'https://x.com/?a=1&b="2"' });
    expect(m.html).not.toContain('<script>');
    expect(m.html).toContain('&lt;script&gt;');
    expect(m.html).toContain('&quot;2&quot;');
  });
});
