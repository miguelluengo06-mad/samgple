import { describe, expect, it } from 'vitest';
import { generateAccessPassword } from '../accessPassword';

describe('generateAccessPassword', () => {
  it('has the requested length and only readable characters', () => {
    for (let i = 0; i < 50; i++) {
      const p = generateAccessPassword();
      expect(p).toHaveLength(10);
      expect(p).toMatch(/^[abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/);
      expect((p.match(/[2-9]/g) || []).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('is different each time', () => {
    expect(new Set(Array.from({ length: 30 }, () => generateAccessPassword())).size).toBe(30);
  });
});
