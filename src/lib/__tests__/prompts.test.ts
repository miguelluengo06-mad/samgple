import { describe, expect, it } from 'vitest';
import { composePrompt, extractVariables, sanitizePrompt, sanitizeTags, STARTER_PIECES } from '../prompts';

describe('prompt pieces', () => {
  it('extracts unique variables in order of appearance', () => {
    expect(extractVariables('Hola {{ nombre }}, tu {{producto}} y {{nombre}}', 'otro {{público}}')).toEqual(['nombre', 'producto', 'público']);
    expect(extractVariables('sin variables')).toEqual([]);
  });

  it('joins pieces with a blank line and fills the variables it is given', () => {
    const out = composePrompt(['Anuncio de {{producto}}.', '  Tono {{tono}}  ', ''], { producto: 'una crema', tono: '' });
    expect(out).toBe('Anuncio de una crema.\n\nTono {{tono}}');
  });

  it('validates what the API receives', () => {
    expect(sanitizePrompt({ title: ' ', body: 'x' })).toBeNull();
    expect(sanitizePrompt({ kind: 'block', title: 'Gancho', body: '' })).toBeNull();
    expect(sanitizePrompt({ kind: 'block', title: ' Gancho ', body: ' texto ', category: 'Gancho' })).toMatchObject({ kind: 'block', title: 'Gancho', body: 'texto', category: 'Gancho' });
    const id = '3f2b8c1e-6a4d-4e0b-9a41-2c8f0b7d5e11';
    expect(sanitizePrompt({ kind: 'recipe', title: 'Receta', block_ids: [id, 'no-uuid'] })?.block_ids).toEqual([id]);
    expect(sanitizePrompt({ kind: 'recipe', title: 'Vacía', block_ids: [] })).toBeNull();
  });

  it('ships starter pieces that are all valid', () => {
    for (const p of STARTER_PIECES) expect(sanitizePrompt({ kind: 'block', ...p })).not.toBeNull();
  });

  it('cleans tags: lowercase, no #, no repeats, max 12', () => {
    expect(sanitizeTags(' #UGC, tiktok ,ugc,, Veo ')).toEqual(['ugc', 'tiktok', 'veo']);
    expect(sanitizeTags(['A', 'a', 'b'])).toEqual(['a', 'b']);
    expect(sanitizeTags(Array.from({ length: 20 }, (_, i) => `t${i}`))).toHaveLength(12);
    expect(sanitizeTags(42)).toEqual([]);
    expect(sanitizePrompt({ title: 'x', body: 'y', tags: 'Veo, UGC' })?.tags).toEqual(['veo', 'ugc']);
  });
});
