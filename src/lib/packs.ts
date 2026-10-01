/**
 * Packs y precios — ÚNICA fuente de datos.
 * La web (/), la landing (/landing) y el cobro con Stripe leen de aquí: cambia un precio o un texto en este
 * archivo y se actualiza en todos los sitios (incluido lo que se cobra en Stripe).
 *
 * TODOS LOS PRECIOS SON CON IVA INCLUIDO: la cifra que ve el cliente es la que paga.
 */

/** Cómo se enseña el IVA en toda la web. Cámbialo aquí si algún día vuelves a precios + IVA. */
export const VAT_LABEL = 'IVA incluido';
export const PRICES_NOTE = 'Todos los precios incluyen IVA.';
/** Tipo de IVA aplicado (solo informativo; los precios ya lo llevan dentro). */
export const VAT_RATE = 0.21;

/* ════════════════════════════════════════════════════════════════════════════
 *  PACK DE BIENVENIDA — la oferta de entrada de la landing
 * ════════════════════════════════════════════════════════════════════════════ */

/**
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │  PLAZAS DISPONIBLES — CAMBIA ESTE NÚMERO A MANO                          │
 * │                                                                          │
 * │  Es el número que se enseña en la landing ("Quedan N de 30 plazas").     │
 * │  Cada vez que vendas un pack, réstale 1 aquí y guarda el archivo.        │
 * │  No hay cuenta atrás ni contador automático: la escasez es la real.      │
 * │  Con 0 la landing pasa sola a "Plazas agotadas", el botón se deshabilita │
 * │  y el servidor deja de aceptar pedidos del Pack de Bienvenida.           │
 * └──────────────────────────────────────────────────────────────────────────┘
 */
export const WELCOME_SPOTS_LEFT = 30;

/** Plazas totales de la oferta (no cambia salvo que abras otra tanda). */
export const WELCOME_SPOTS_TOTAL = 30;

export const WELCOME_PACK = {
  /** Identificador para el cobro con Stripe */
  id: 'bienvenida',
  name: 'Pack de Bienvenida',
  price: 30,
  cta: 'Quiero mi pack por 30 €',
  /** Precio ancla */
  anchor: 'Un vídeo con creador humano cuesta entre 100 y 400 €',
  includes: [
    '2 vídeos de tu producto (1 vídeo base con 2 ganchos distintos para que puedas probar cuál funciona mejor)',
    'Guion pensado para vender',
    'Formato vertical 9:16 con subtítulos',
    'Entrega en 72 h',
  ],
  conditions: ['1 producto', 'Sin revisiones', 'Una sola vez por empresa'],
  bonus:
    'Si contratas cualquier otro pack en los 7 días siguientes, te descontamos los 30 € y te regalamos 2 vídeos extra.',
} as const;

/** Enlace de la landing a la sección de precios de la web. */
export const WEB_PRICING_URL = '/#precios';

/** Preguntas frecuentes del Pack de Bienvenida. */
export const WELCOME_FAQ = [
  {
    q: '¿Qué necesito enviar?',
    a: 'Solo el nombre de tu producto, su web o ficha y, si las tienes, unas fotos. El guion y los vídeos los hacemos nosotros.',
  },
  {
    q: '¿Cuándo lo recibo?',
    a: 'En 72 horas, desde que tenemos tu pago y los datos de tu producto.',
  },
  {
    q: '¿Qué pasa después?',
    a: 'Recibes 2 vídeos listos para publicar y probar cuál funciona mejor. Si te convencen, contrata otro pack en los 7 días siguientes: te descontamos los 30 € y te regalamos 2 vídeos extra.',
  },
  {
    q: '¿Cómo pago y recibo factura?',
    a: 'Pagas con tarjeta en una pantalla segura de Stripe. El precio ya lleva el IVA incluido y, al pagar, puedes añadir el NIF de tu empresa para recibir la factura con el IVA desglosado.',
  },
  {
    q: '¿Para qué redes sirve?',
    a: 'Para Instagram, TikTok y Facebook (Reels y Stories) y para anuncios en Meta y TikTok. Formato vertical 9:16, con subtítulos.',
  },
] as const;

/* ════════════════════════════════════════════════════════════════════════════
 *  RESTO DE PACKS
 * ════════════════════════════════════════════════════════════════════════════ */

export type PriceUnit = 'once' | 'month' | 'video';

export interface Pack {
  /** Identificador estable para el cobro con Stripe (no lo cambies si ya has vendido este pack) */
  id: string;
  name: string;
  /** € con IVA incluido (lo que paga el cliente) */
  price: number;
  /** 'once' = pago único · 'month' = suscripción mensual · 'video' = por vídeo (pago único) */
  unit: PriceUnit;
  /** Una línea: para quién es */
  forWho: string;
  /** Una línea: el beneficio principal */
  pitch: string;
  includes: string[];
  /** Etiqueta sobre la portada ("El más elegido", "Recomendado"). No implica que la ficha se resalte: ver `featured` */
  badge?: string;
  /** Resalta la ficha con borde (la opción recomendada). Si no se indica, se resalta la que lleve `badge` */
  featured?: boolean;
  /** Precio por vídeo ya escrito como se enseña ("54,44 €"). Solo si quieres enseñarlo en esa ficha */
  perUnit?: string;
  /** Texto junto al precio por vídeo ("~2 publicaciones semanales") */
  perUnitNote?: string;
  /** Ventaja que se enseña en una píldora verde junto al precio ("Setup incluido", "Setup gratis") */
  perk?: string;
  /** Aclaración corta bajo el precio */
  priceNote?: string;
  /** Lo principal que se lleva el cliente, en grande sobre la portada de la ficha ("10 vídeos") */
  headline: string;
  /** Compromiso mínimo, si lo hay (se enseña en la ficha y en la pantalla de pago) */
  commitment?: string;
}

export interface PackGroup {
  id: string;
  title: string;
  /** Nombre corto para etiquetas y filtros */
  short: string;
  /** Qué es / para quién (una línea) */
  tagline: string;
  packs: Pack[];
  /** Condiciones del grupo (permanencia, revisiones…) */
  conditions?: string[];
  /** Aviso visible bajo los packs */
  notice?: string;
  /** Frase corta para resúmenes */
  summary: string;
  /** "Desde…" para resúmenes (precio con IVA incluido) */
  from: string;
}

export const PACK_GROUPS: PackGroup[] = [
  {
    id: 'ugc',
    short: 'Anuncios UGC',
    title: 'Anuncios UGC con IA',
    tagline: 'Anuncios que parecen de un cliente real, listos para TikTok, Reels, Shorts y Ads. Sin grabar y sin pagar a creadores.',
    summary: 'Vídeos UGC con IA en vertical 9:16, con guion, voz y subtítulos, para testear y escalar tus anuncios.',
    from: 'Desde 190 €',
    packs: [
      {
        id: 'ugc-starter',
        name: 'Starter',
        price: 190,
        unit: 'once',
        headline: '5 vídeos',
        badge: 'Ideal para testear',
        featured: false,
        forWho: 'Para testear tu primera tanda de anuncios.',
        pitch: 'Cinco vídeos completos para ver qué funciona antes de invertir más.',
        includes: [
          '5 vídeos UGC completos (formato 9:16 vertical para TikTok / Reels / Shorts / Ads)',
          'Guiones estratégicos',
          'Locución con voz IA natural y música libre de derechos',
          'Edición dinámica con subtítulos estilo viral',
          '1 ronda de revisiones estéticas incluida',
          'Entrega: 3 a 5 días laborables',
        ],
      },
      {
        id: 'ugc-escala',
        name: 'Escala',
        price: 320,
        unit: 'once',
        headline: '10 vídeos',
        badge: 'Más popular',
        featured: true,
        forWho: 'Para marcas que ya anuncian y quieren escalar.',
        pitch: 'Diez vídeos con guiones pensados para convertir y hacer pruebas A/B.',
        includes: [
          '10 vídeos UGC en formato vertical 9:16',
          'Guiones optimizados para conversión y A/B testing',
          'Voces IA realistas y efectos de sonido',
          'Subtítulos dinámicos y ganchos visuales',
          '1 ronda de revisiones por lote',
          'Entrega: 5 a 7 días laborables',
        ],
      },
      {
        id: 'ugc-volumen',
        name: 'Volumen',
        price: 599,
        unit: 'once',
        headline: '20 vídeos',
        badge: 'Mejor precio por vídeo',
        featured: false,
        forWho: 'Para campañas de Ads con muchas variaciones que probar.',
        pitch: 'Veinte creativos listos para pautar, al mejor precio por vídeo.',
        includes: [
          '20 creativos completos listos para campañas de Ads masivas',
          'Variaciones de hooks/ganchos para pruebas A/B de anuncios',
          'Locución con voz IA, guiones y edición completa listos para pautar',
          'Subtítulos interactivos y llamadas a la acción personalizadas',
          '1 ronda de revisiones por lote',
          'Entrega: 7 a 10 días laborables',
        ],
      },
    ],
  },
  {
    id: 'influencer',
    short: 'Influencer IA',
    title: 'Influencer IA para tu marca',
    tagline: 'Un influencer propio que publica por ti: siempre la misma cara, la misma voz y tu marca.',
    summary: 'Un personaje propio con la misma cara y voz en todos tus vídeos, listo para publicar en tus redes.',
    from: 'Desde 490 €',
    packs: [
      {
        id: 'influencer-presencia',
        name: 'Presencia',
        price: 490,
        unit: 'once',
        perUnit: '54,44 €',
        perUnitNote: '~2 publicaciones semanales',
        headline: '9 vídeos',
        badge: 'Ideal para empezar',
        featured: false,
        forWho: 'Para empezar a tener presencia constante en redes.',
        pitch: 'Tu personaje propio publicando unas dos veces por semana.',
        includes: [
          '9 vídeos completos con personaje IA consistente en formato 9:16 vertical',
          'Generación y mantenimiento de identidad visual única para tu marca',
          'Lipsync avanzado, locución natural con voz IA y música libre de derechos',
          'Edición dinámica con subtítulos automáticos estilo viral',
          '1 ronda de revisiones estéticas incluida',
          'Entrega: 5 a 7 días laborables',
        ],
      },
      {
        id: 'influencer-crecimiento',
        name: 'Crecimiento',
        price: 690,
        unit: 'once',
        perUnit: '49,28 €',
        perUnitNote: '~3 publicaciones semanales',
        headline: '14 vídeos',
        badge: 'Más popular',
        featured: true,
        forWho: 'Para crecer con un ritmo de publicación equilibrado.',
        pitch: 'Catorce vídeos con avatar recurrente y guiones pensados para tu nicho.',
        includes: [
          '14 vídeos verticales con avatar IA recurrente',
          'Propuestas de guiones estratégicos adaptados al nicho',
          'Sincronización labial de alta precisión y montaje dinámico',
          'Subtítulos atractivos, ganchos visuales y llamadas a la acción',
          '1 ronda de revisiones por lote',
          'Entrega: 7 a 10 días laborables',
        ],
      },
      {
        id: 'influencer-dominio',
        name: 'Dominio',
        price: 1190,
        unit: 'once',
        perUnit: '44,07 €',
        perUnitNote: 'Casi 1 post diario · Mayor ahorro',
        headline: '27 vídeos',
        badge: 'Máxima cobertura',
        featured: false,
        forWho: 'Para cubrir todo el mes de presencia de tu marca.',
        pitch: 'Veintisiete vídeos para publicar casi cada día, con variedad de escenarios y atuendos.',
        includes: [
          '27 vídeos completos para cubrir la presencia mensual de la marca',
          'Variación de escenarios y atuendos manteniendo consistencia de personaje',
          'Guiones, locución IA premium y edición completa listos para publicar',
          'Subtítulos dinámicos optimizados para retención en TikTok, Reels y Shorts',
          '1 ronda de revisiones por lote',
          'Entrega en 2 fases o lote completo: 10 a 14 días laborables',
        ],
      },
    ],
  },
  {
    id: 'replica',
    short: 'Clonación IA',
    title: 'Clonación y gemelo digital IA',
    tagline: 'Sal en tus vídeos sin ponerte delante de una cámara: un gemelo digital con tu rostro, tu voz y tu forma de hablar.',
    summary: 'Un gemelo digital con tu imagen y tu voz para publicar vídeos sin grabarte.',
    from: 'Desde 490 €',
    notice: 'Solo creamos réplicas de la propia persona, con su autorización por escrito.',
    packs: [
      {
        id: 'replica-marca-personal',
        name: 'Marca Personal',
        price: 490,
        unit: 'once',
        perUnit: '81,66 €',
        perUnitNote: 'Incluye setup inicial completo',
        perk: 'Setup incluido',
        headline: '6 vídeos',
        badge: 'Ideal para empezar',
        featured: false,
        forWho: 'Para fundadores y creadores que empiezan con su gemelo digital.',
        pitch: 'Tu gemelo digital listo y seis vídeos para publicar, sin grabarte.',
        includes: [
          'Setup inicial: clonación ultra-realista de voz y calibración del avatar digital',
          '6 vídeos listos para publicar en formato vertical 9:16 (TikTok, Reels, Shorts, LinkedIn)',
          'Guiones estratégicos adaptados al tono del cliente',
          'Sincronización labial avanzada y gesticulación natural',
          'Edición dinámica con subtítulos estilo viral y b-roll de apoyo',
          '1 ronda de revisiones estéticas incluida',
          'Entrega: 5 a 7 días laborables',
        ],
      },
      {
        id: 'replica-autoridad',
        name: 'Autoridad',
        price: 790,
        unit: 'once',
        perUnit: '65,83 €',
        perUnitNote: '~3 publicaciones por semana',
        perk: 'Setup incluido',
        headline: '12 vídeos',
        badge: 'Más popular',
        featured: true,
        forWho: 'Para posicionar tu marca personal con constancia.',
        pitch: 'Doce vídeos enfocados a autoridad y retención, con tu gemelo ya calibrado.',
        includes: [
          'Setup inicial completo (clonación de voz HD + gemelo digital calibrado)',
          '12 vídeos verticales optimizados para posicionamiento de marca personal',
          'Propuestas de guiones enfocados a autoridad y retención',
          'Montaje dinámico, efectos de sonido y subtítulos de alta calidad',
          'Reutilización de modelo digital para futuras entregas',
          '1 ronda de revisiones por lote',
          'Entrega: 7 a 10 días laborables',
        ],
      },
      {
        id: 'replica-escala-total',
        name: 'Escala Total',
        price: 1290,
        unit: 'once',
        perUnit: '53,75 €',
        perUnitNote: 'Casi 1 post diario · Mayor ahorro',
        perk: 'Setup gratis',
        headline: '24 vídeos',
        badge: 'Máximo ahorro',
        featured: false,
        forWho: 'Para cubrir todo el mes de presencia de un fundador o creador.',
        pitch: 'Veinticuatro vídeos con tu voz clonada y el setup sin coste.',
        includes: [
          'Setup inicial de clonación 100 % bonificado (ahorro directo en la configuración)',
          '24 vídeos completos para cubrir la presencia mensual del creador o fundador',
          'Guiones, locución clonada del cliente y edición completa listos para pautar o publicar',
          'Variación de planos y ritmo visual para maximizar visualizaciones',
          '1 ronda de revisiones por lote',
          'Entrega en 2 fases o lote completo: 10 a 14 días laborables',
        ],
      },
    ],
  },
];

/** Vídeo suelto */
export const SINGLE_VIDEO: Pack = {
  id: 'video-suelto',
  name: 'Vídeo suelto',
  headline: '1 vídeo',
  price: 60,
  unit: 'video',
  forWho: 'Para cuando solo necesitas una pieza.',
  pitch: 'Un vídeo, cuando lo necesitas.',
  includes: ['1 vídeo', '1 revisión', 'Entrega en 5 días'],
};

/** Extras (se piden al contratar; no se compran por separado en la web) */
export const EXTRAS: { name: string; price: string }[] = [
  { name: 'Gancho adicional', price: '15 €' },
  { name: 'Revisión extra', price: '20 €' },
  { name: 'Entrega urgente (menos de 48 h)', price: '+30 %' },
];

/* ════════════════════════════════════════════════════════════════════════════
 *  Cobro con Stripe
 * ════════════════════════════════════════════════════════════════════════════ */

export interface PurchasablePack {
  id: string;
  /** Nombre completo para el recibo: "Anuncios UGC con IA · Pro" */
  name: string;
  /** Texto del recibo / de la pantalla de pago */
  description: string;
  /** € IVA incluido */
  price: number;
  /** Céntimos IVA incluido (lo que se cobra) */
  cents: number;
  /** 'payment' (pago único) o 'subscription' (mensual) */
  mode: 'payment' | 'subscription';
  commitment?: string;
  group: string;
}

export function toPurchasable(pack: Pack, group: string): PurchasablePack {
  return {
    id: pack.id,
    name: group === pack.name ? pack.name : `${group} · ${pack.name}`,
    description: pack.includes.join(' · ').slice(0, 450),
    price: pack.price,
    cents: Math.round(pack.price * 100),
    mode: pack.unit === 'month' ? 'subscription' : 'payment',
    commitment: pack.commitment,
    group,
  };
}

/** Todo lo que se puede comprar en la web, por identificador. */
export function getPurchasable(id: string): PurchasablePack | null {
  if (id === WELCOME_PACK.id) {
    return {
      id: WELCOME_PACK.id,
      name: WELCOME_PACK.name,
      description: '2 vídeos de tu producto · Guion para vender · 9:16 con subtítulos · Entrega en 72 h',
      price: WELCOME_PACK.price,
      cents: WELCOME_PACK.price * 100,
      mode: 'payment',
      group: WELCOME_PACK.name,
    };
  }
  if (id === SINGLE_VIDEO.id) return toPurchasable(SINGLE_VIDEO, SINGLE_VIDEO.name);
  for (const group of PACK_GROUPS) {
    const pack = group.packs.find((p) => p.id === id);
    if (pack) return toPurchasable(pack, group.title);
  }
  return null;
}

/** Identificadores de todos los packs comprables (para tests y validaciones). */
export function allPurchasableIds(): string[] {
  return [WELCOME_PACK.id, ...PACK_GROUPS.flatMap((g) => g.packs.map((p) => p.id)), SINGLE_VIDEO.id];
}

/* ════════════════════════════════════════════════════════════════════════════
 *  Helpers
 * ════════════════════════════════════════════════════════════════════════════ */

/** 1490 → "1.490" (es-ES no agrupa los miles de 4 cifras, y los precios se escriben "1.490 €") */
export function formatAmount(amount: number): string {
  return String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function formatEur(amount: number): string {
  return `${formatAmount(amount)} €`;
}

export function unitLabel(unit: PriceUnit): string {
  return unit === 'month' ? '/mes' : unit === 'video' ? '/vídeo' : '';
}

/** Precio más bajo de un grupo, con su unidad, para resúmenes ("desde 290 €"). */
export function startingPrice(group: PackGroup): { amount: number; unit: PriceUnit } {
  const cheapest = group.packs.reduce((min, p) => (p.price < min.price ? p : min), group.packs[0]);
  return { amount: cheapest.price, unit: cheapest.unit };
}

/** Plazas del Pack de Bienvenida, acotadas a 0…total por si se edita mal el número. */
export function welcomeSpots(left: number = WELCOME_SPOTS_LEFT, total: number = WELCOME_SPOTS_TOTAL) {
  const safeLeft = Math.max(0, Math.min(total, Math.floor(Number.isFinite(left) ? left : 0)));
  return { left: safeLeft, total, taken: total - safeLeft, soldOut: safeLeft === 0 };
}
