import { describe, it, expect } from 'vitest';
import { whatsappDigits } from '@/lib/contact';

describe('contact', () => {
  it('añade el prefijo de España a los móviles escritos sin él', () => {
    expect(whatsappDigits('600000000')).toBe('34600000000');
    expect(whatsappDigits('600 000 000')).toBe('34600000000');
    expect(whatsappDigits('+34 600 000 000')).toBe('34600000000');
    expect(whatsappDigits('0034 600000000')).toBe('34600000000');
  });

  it('respeta los números de otros países', () => {
    expect(whatsappDigits('+44 7911 123456')).toBe('447911123456');
    expect(whatsappDigits(null)).toBe('');
  });
});
