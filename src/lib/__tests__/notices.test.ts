import { describe, expect, it } from 'vitest';
import { addNotice, markNoticeRead, parseNotices } from '../notices';

describe('notices', () => {
  it('rejects empty titles or messages', () => {
    expect(addNotice(null, { title: ' ', body: 'x' })).toBeNull();
    expect(addNotice(null, { title: 'x', body: '' })).toBeNull();
    expect(addNotice(null, { title: 5, body: {} })).toBeNull();
  });

  it('adds the newest notice first and keeps the other answers', () => {
    const a = addNotice({ budget: '1.000' }, { title: 'Guion listo', body: 'Revísalo' })!;
    const b = addNotice(a.answers, { title: 'Vídeos listos', body: 'Ya puedes verlos' })!;
    expect(b.answers.budget).toBe('1.000');
    expect(parseNotices(b.answers).map((n) => n.title)).toEqual(['Vídeos listos', 'Guion listo']);
    expect(a.notice.read_at).toBeNull();
  });

  it('marks a notice as read only once', () => {
    const a = addNotice(null, { title: 't', body: 'b' })!;
    const read = markNoticeRead(a.answers, a.notice.id)!;
    expect(parseNotices(read)[0].read_at).toBeTruthy();
    expect(markNoticeRead(read, a.notice.id)).toBeNull();
    expect(markNoticeRead(a.answers, 'nope')).toBeNull();
  });

  it('caps the stored notices', () => {
    let answers: Record<string, unknown> | null = null;
    for (let i = 0; i < 60; i++) answers = addNotice(answers, { title: `t${i}`, body: 'b' })!.answers;
    expect(parseNotices(answers)).toHaveLength(50);
  });
});
