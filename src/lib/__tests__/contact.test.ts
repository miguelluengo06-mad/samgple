import { describe, it, expect } from 'vitest';
import { WHATSAPP_NUMBER, whatsappDigits, whatsappUrl } from '@/lib/contact';

describe('contact', () => {
  it('el WhatsApp de la agencia es el 692 168 981', () => {
    expect(WHATSAPP_NUMBER).toBe('34692168981');
    expect(whatsappUrl('Hola')).toBe('https://wa.me/34692168981?text=Hola');
  });

  it('añade el prefijo de España a los móviles escritos sin él', () => {
    expect(whatsappDigits('692168981')).toBe('34692168981');
    expect(whatsappDigits('692 168 981')).toBe('34692168981');
    expect(whatsappDigits('+34 692 168 981')).toBe('34692168981');
    expect(whatsappDigits('0034 692168981')).toBe('34692168981');
  });

  it('respeta los números de otros países', () => {
    expect(whatsappDigits('+44 7911 123456')).toBe('447911123456');
    expect(whatsappDigits(null)).toBe('');
  });
});
