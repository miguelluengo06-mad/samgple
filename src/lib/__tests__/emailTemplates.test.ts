import { describe, it, expect } from 'vitest';
import { leadEmail, purchaseEmail } from '@/lib/emailTemplates';

const opts = { panelUrl: 'https://samgple.com/portal/leads?open=abc', receivedAt: new Date('2026-09-25T10:00:00Z') };

describe('leadEmail', () => {
  it('llamada agendada: fecha, hora de Madrid y botones de contacto', () => {
    const m = leadEmail(
      { name: 'Ana Ruiz', email: 'ana@tienda.es', phone: '692168981', company: 'Tienda Sol', message: 'Quiero vídeos', kind: 'call', source: 'website', callAt: new Date('2026-09-30T08:30:00Z'), answers: { needs: ['Vídeo', 'Anuncios'], budget: '500-1000', timeline: 'Este mes' } },
      opts
    );
    expect(m.subject).toContain('Nueva llamada agendada — Ana Ruiz (Tienda Sol)');
    expect(m.subject).toContain('10:30');
    expect(m.html).toContain('30 minutos');
    expect(m.html).toContain('https://wa.me/34692168981'); // móvil sin prefijo → con 34
    expect(m.html).toContain('mailto:ana@tienda.es');
    expect(m.html).toContain(opts.panelUrl);
    expect(m.html).toContain('Vídeo');
    expect(m.text).toContain('Llamada:');
  });

  it('pack de bienvenida: pedido, web y producto, sin bloque de mensaje duplicado', () => {
    const m = leadEmail(
      { name: 'Tienda Luna', phone: '+34 600 123 123', company: 'Tienda Luna', message: 'Pack de Bienvenida (30 € IVA incluido)\nWeb o tienda: luna.es', kind: 'proposal', source: 'landing', pack: { website: 'luna.es', product: 'Vela de soja', runs_ads: 'No' }, utm: { utm_source: 'instagram', utm_campaign: 'pack30' } },
      opts
    );
    expect(m.subject).toBe('Nuevo lead del Pack de Bienvenida — Tienda Luna (Tienda Luna)');
    expect(m.html).toContain('20 € (IVA incluido)');
    expect(m.html).toContain('Vela de soja');
    expect(m.html).toContain('Campaña: pack30');
    expect(m.html).not.toContain('mailto:'); // no hay email
  });

  it('escapa lo que escribe el visitante', () => {
    const m = leadEmail({ name: '<script>alert(1)</script>', message: '"><img src=x onerror=alert(1)>', kind: 'proposal', source: 'website', phone: '600000000' }, opts);
    expect(m.html).not.toContain('<script>');
    expect(m.html).not.toContain('<img src=x');
    expect(m.html).toContain('&lt;script&gt;');
  });

  it('propuesta web y lead de landing tienen su propio asunto', () => {
    expect(leadEmail({ name: 'A', message: 'm', kind: 'proposal', source: 'website', email: 'a@a.es' }, opts).subject).toContain('Nueva propuesta solicitada');
    expect(leadEmail({ name: 'A', message: 'm', kind: 'proposal', source: 'landing', phone: '600000000' }, opts).subject).toContain('Nuevo lead de la landing');
  });
});

describe('purchaseEmail', () => {
  it('compra pagada con IVA incluido y enlace a Stripe', () => {
    const m = purchaseEmail(
      { packName: 'Pack de Bienvenida', amountEur: 20, monthly: false, livemode: true, customerName: 'Ana', customerEmail: 'ana@x.es', customerPhone: '+34 692168981', stripeUrl: 'https://dashboard.stripe.com/payments/pi_1' },
      opts
    );
    expect(m.subject).toBe('Nueva compra — Pack de Bienvenida · 20 € (IVA incluido)');
    expect(m.html).toContain('https://dashboard.stripe.com/payments/pi_1');
    expect(m.html).toContain('Compra pagada');
  });

  it('marca las compras de prueba', () => {
    const m = purchaseEmail({ packName: 'UGC Mensual', amountEur: 790, monthly: true, livemode: false }, opts);
    expect(m.subject).toContain('[prueba]');
    expect(m.html).toContain('al mes');
    expect(m.html).toContain('no se ha cobrado dinero real');
  });
});
