import { describe, expect, it } from 'vitest';
import { MAX_VIDEO_SECONDS, MAX_WORDS, clientCanDo, creditsForItems, creditsForPackId, estimateSeconds, safeUrl, sanitizeAvatar, validateVideoRequest } from '../videos';

const AVATAR = '3f2b8c1e-6a4d-4e0b-9a41-2c8f0b7d5e11';
const words = (n: number) => Array.from({ length: n }, () => 'hola').join(' ');

describe('estimateSeconds', () => {
  it('is 0 for empty text and grows with the words (≈ 2.5 per second)', () => {
    expect(estimateSeconds('')).toBe(0);
    expect(estimateSeconds('   ')).toBe(0);
    expect(estimateSeconds(words(5))).toBe(2);
    expect(estimateSeconds(words(MAX_WORDS))).toBe(MAX_VIDEO_SECONDS);
    expect(estimateSeconds(words(MAX_WORDS + 1))).toBeGreaterThan(MAX_VIDEO_SECONDS);
  });
});

describe('credits per pack', () => {
  it('uses the number of videos of each pack', () => {
    expect(creditsForPackId('bienvenida')).toBe(2);
    expect(creditsForPackId('video-suelto')).toBe(1);
    expect(creditsForPackId('ugc-starter')).toBe(5);
    expect(creditsForPackId('ugc-escala')).toBe(10);
    expect(creditsForPackId('ugc-volumen')).toBe(20);
    expect(creditsForPackId('influencer-crecimiento')).toBe(14);
    expect(creditsForPackId('replica-autoridad')).toBe(12);
  });

  it('never invents credits for unknown packs and multiplies by quantity', () => {
    expect(creditsForPackId('no-existe')).toBe(0);
    expect(creditsForPackId('cart')).toBe(0);
    expect(creditsForItems([{ pack_id: 'ugc-escala', qty: 2 }, { pack_id: 'video-suelto', qty: 3 }, { pack_id: 'raro', qty: 9 }])).toBe(23);
    expect(creditsForItems([])).toBe(0);
  });
});

describe('what the customer may do', () => {
  it('approves or asks for changes only on a script waiting for review, cancels only before work starts', () => {
    expect(clientCanDo('script_review', 'approve')).toBe('production');
    expect(clientCanDo('script_review', 'changes')).toBe('scripting');
    expect(clientCanDo('requested', 'cancel')).toBe('cancelled');
    expect(clientCanDo('production', 'cancel')).toBeNull();
    expect(clientCanDo('scripting', 'approve')).toBeNull();
    expect(clientCanDo('delivered', 'changes')).toBeNull();
  });
});

describe('validateVideoRequest', () => {
  const ok = { avatarId: AVATAR, scriptNotes: 'Quiero que hable de mi crema hidratante y de por qué es distinta.' };

  it('accepts a valid request and cleans the optional fields', () => {
    const r = validateVideoRequest({ ...ok, product: ' Crema ', tone: 'Cercano', cta: ' Compra hoy ', driveUrl: 'https://drive.google.com/drive/folders/abc' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toMatchObject({ product: 'Crema', tone: 'Cercano', cta: 'Compra hoy', driveUrl: 'https://drive.google.com/drive/folders/abc' });
      expect(r.seconds).toBeGreaterThan(0);
    }
  });

  it('requires an avatar and some notes', () => {
    expect(validateVideoRequest({ ...ok, avatarId: 'x' })).toEqual({ ok: false, error: 'Elige un avatar.' });
    expect(validateVideoRequest({ avatarId: AVATAR, scriptNotes: 'hola' }).ok).toBe(false);
  });

  it('rejects notes that would run past 45 seconds', () => {
    const r = validateVideoRequest({ avatarId: AVATAR, scriptNotes: words(MAX_WORDS + 5) });
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.error).toContain('45 segundos');
    expect(validateVideoRequest({ avatarId: AVATAR, scriptNotes: words(MAX_WORDS) }).ok).toBe(true);
  });

  it('only accepts http(s) links for Drive', () => {
    expect(validateVideoRequest({ ...ok, driveUrl: 'javascript:alert(1)' }).ok).toBe(false);
    expect(validateVideoRequest({ ...ok, driveUrl: 'no es un enlace' }).ok).toBe(false);
    expect(safeUrl('data:text/html,<script>')).toBe('');
    expect(safeUrl('https://x.com/a b')).toContain('https://x.com/');
    expect(validateVideoRequest({ ...ok, driveUrl: '' }).ok).toBe(true);
  });
});

describe('sanitizeAvatar', () => {
  it('needs a name and an http(s) image, and cleans the rest', () => {
    const a = sanitizeAvatar({ name: ' Lucía ', style: 'UGC', gender: 'Mujer', tags: ' #Belleza, belleza, moda ', image_url: 'https://cdn.example.com/lucia.jpg', preview_url: 'https://cdn.example.com/lucia.mp4' });
    expect(a).toEqual({ name: 'Lucía', style: 'UGC', gender: 'Mujer', tags: ['belleza', 'moda'], image_url: 'https://cdn.example.com/lucia.jpg', preview_url: 'https://cdn.example.com/lucia.mp4', active: true });
    expect(sanitizeAvatar({ name: '', image_url: 'https://x.com/a.jpg' })).toBeNull();
    expect(sanitizeAvatar({ name: 'X', image_url: 'javascript:alert(1)' })).toBeNull();
    expect(sanitizeAvatar({ name: 'X', image_url: 'https://x.com/a.jpg', preview_url: 'data:video/mp4;base64,AA' })?.preview_url).toBeNull();
    expect(sanitizeAvatar({ name: 'X', image_url: 'https://x.com/a.jpg', active: false })?.active).toBe(false);
  });
});
