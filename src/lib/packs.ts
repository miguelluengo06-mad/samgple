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
  /** Etiqueta destacada ("El más elegido", "Recomendado") */
  badge?: string;
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
    tagline: 'Anuncios que parecen de un cliente real, listos para Meta y TikTok. Sin grabar y sin pagar a creadores.',
    summary: 'Anuncios UGC para Meta y TikTok, con varios ganchos por vídeo para probar qué vende.',
    from: 'Desde 290 €',
    packs: [
      {
        id: 'ugc-basico',
        name: 'Básico',
        price: 290,
        unit: 'once',
        headline: '10 vídeos',
        forWho: 'Para tu primera tanda de anuncios.',
        pitch: 'Prueba qué anuncio funciona antes de invertir más.',
        includes: ['10 vídeos', '2 ganchos por cada vídeo'],
      },
      {
        id: 'ugc-pro',
        name: 'Pro',
        price: 490,
        unit: 'once',
        headline: '15 vídeos',
        badge: 'El más elegido',
        forWho: 'Para marcas que ya invierten en anuncios.',
        pitch: 'Más ángulos para probar y dos revisiones para afinar.',
        includes: ['15 vídeos', 'Ganchos para cada vídeo', '2 revisiones'],
      },
      {
        id: 'ugc-mensual',
        name: 'Mensual',
        price: 790,
        unit: 'month',
        headline: '20 vídeos/mes',
        forWho: 'Para escalar sin quedarte sin creatividades.',
        pitch: 'Contenido nuevo cada mes, mejorado con lo que ya funciona.',
        includes: ['20 vídeos al mes', 'Estrategia de ángulos de venta', 'Iteración según resultados'],
      },
    ],
  },
  {
    id: 'influencer',
    short: 'Influencer IA',
    title: 'Influencer IA para tu marca',
    tagline: 'Un influencer propio que publica por ti: siempre la misma cara, la misma voz y tu marca.',
    summary: 'Un personaje propio que publica en tus redes, siempre con la misma cara.',
    from: 'Desde 490 €/mes',
    conditions: ['Permanencia mínima de 3 meses', '2 rondas de revisión al mes'],
    packs: [
      {
        id: 'influencer-creacion',
        name: 'Creación del personaje',
        price: 290,
        unit: 'once',
        headline: 'Tu personaje',
        forWho: 'El primer paso para tener tu propio influencer.',
        pitch: 'Un personaje único, con voz y estilo propios.',
        priceNote: 'Pago único. Gratis si contratas 6 meses.',
        includes: ['Diseño del personaje', 'Voz', 'Personalidad', 'Ficha de estilo'],
      },
      {
        id: 'influencer-presencia',
        name: 'Presencia',
        price: 490,
        unit: 'month',
        headline: '8 vídeos/mes',
        forWho: 'Para estar en redes cada semana sin esfuerzo.',
        pitch: 'Tu marca aparece con constancia, sin que tú grabes nada.',
        commitment: 'Permanencia mínima de 3 meses',
        includes: ['8 vídeos al mes', 'Guiones incluidos'],
      },
      {
        id: 'influencer-crecimiento',
        name: 'Crecimiento',
        price: 890,
        unit: 'month',
        headline: '16 vídeos/mes',
        badge: 'Recomendado',
        forWho: 'Para crecer con constancia y un plan claro.',
        pitch: 'Vídeos, calendario y textos: todo el contenido resuelto.',
        commitment: 'Permanencia mínima de 3 meses',
        includes: ['16 vídeos al mes', 'Guiones incluidos', 'Calendario de publicación', 'Textos para los posts'],
      },
      {
        id: 'influencer-marca',
        name: 'Marca',
        price: 1490,
        unit: 'month',
        headline: '30 vídeos/mes',
        forWho: 'Para marcas que quieren publicar cada día.',
        pitch: 'Un vídeo al día para dominar tus redes.',
        commitment: 'Permanencia mínima de 3 meses',
        includes: ['30 vídeos al mes (uno al día)', 'Todo lo anterior'],
      },
    ],
  },
  {
    id: 'ecommerce',
    short: 'Ecommerce',
    title: 'Vídeos para Ecommerce',
    tagline: 'Vídeos de producto que enseñan lo que vendes en tu ficha, tu web y tu catálogo. En vertical (9:16) y cuadrado (1:1).',
    summary: 'Vídeos de producto para fichas, web y catálogo, en vertical y cuadrado.',
    from: 'Desde 99 €',
    packs: [
      {
        id: 'ecommerce-producto',
        name: 'Producto',
        price: 99,
        unit: 'once',
        headline: '3 vídeos',
        forWho: 'Para probar con tu producto estrella.',
        pitch: 'Un producto, tres vídeos para su ficha y tus redes.',
        includes: ['1 producto × 3 vídeos', 'En formato 9:16 y 1:1'],
      },
      {
        id: 'ecommerce-coleccion',
        name: 'Colección',
        price: 349,
        unit: 'once',
        headline: '10 vídeos',
        forWho: 'Para renovar una colección entera.',
        pitch: 'Cinco productos con vídeo propio, de golpe.',
        includes: ['5 productos × 2 vídeos', '10 vídeos en total'],
      },
      {
        id: 'ecommerce-catalogo',
        name: 'Catálogo',
        price: 890,
        unit: 'once',
        headline: '30 vídeos',
        forWho: 'Para tiendas con muchos productos.',
        pitch: 'Vídeo en todo tu catálogo, sin montar un estudio.',
        includes: ['15 productos × 2 vídeos', '30 vídeos en total'],
      },
    ],
  },
  {
    id: 'avatar',
    short: 'Avatar IA',
    title: 'Avatar IA a medida',
    tagline: 'Un personaje exclusivo que da cara y voz a tu marca.',
    summary: 'Un personaje diseñado en exclusiva para tu marca, con voz propia.',
    from: 'Desde 290 €',
    packs: [
      {
        id: 'avatar-basico',
        name: 'Avatar Básico',
        price: 290,
        unit: 'once',
        headline: 'Tu avatar',
        forWho: 'Para dar cara y voz a tu marca.',
        pitch: 'Un personaje solo tuyo, listo para usar.',
        includes: ['Personaje a medida', '10 imágenes', 'Voz', '2 vídeos'],
      },
      {
        id: 'avatar-pro',
        name: 'Avatar Pro',
        price: 490,
        unit: 'once',
        headline: 'Tu avatar Pro',
        forWho: 'Para usar tu avatar en todos los canales.',
        pitch: 'Más imágenes, más vídeos y una ficha de estilo para mantener la coherencia.',
        includes: ['Todo lo anterior', '20 imágenes', 'Ficha de estilo', '5 vídeos'],
      },
    ],
  },
  {
    id: 'replica',
    short: 'Réplica digital',
    title: 'Tu réplica digital',
    tagline: 'Sal en tus vídeos sin ponerte delante de una cámara: un clon de tu imagen y de tu voz.',
    summary: 'Un clon de tu imagen y tu voz para hacer vídeos sin grabarte.',
    from: 'Desde 490 €',
    notice: 'Solo creamos réplicas de la propia persona, con su autorización por escrito.',
    packs: [
      {
        id: 'replica-esencial',
        name: 'Réplica Esencial',
        price: 490,
        unit: 'once',
        headline: '5 vídeos',
        forWho: 'Para empezar a salir en vídeo sin grabarte.',
        pitch: 'Tu cara y tu voz, sin sesiones de grabación.',
        includes: ['Clon de tu imagen', 'Voz', '5 vídeos'],
      },
      {
        id: 'replica-pro',
        name: 'Réplica Pro',
        price: 890,
        unit: 'once',
        headline: '10 vídeos',
        forWho: 'Para hablar a tus clientes en español e inglés.',
        pitch: 'Dos idiomas y dos looks para llegar más lejos.',
        includes: ['Clon de tu imagen', 'Voz en español e inglés', '2 looks', '10 vídeos'],
      },
      {
        id: 'replica-mensual-8',
        name: 'Mensual 8',
        price: 390,
        unit: 'month',
        headline: '8 vídeos/mes',
        forWho: 'Para publicar con tu réplica cada mes.',
        pitch: 'Vídeos nuevos con tu réplica, sin volver a grabar.',
        includes: ['8 vídeos al mes con tu réplica'],
      },
      {
        id: 'replica-mensual-16',
        name: 'Mensual 16',
        price: 690,
        unit: 'month',
        headline: '16 vídeos/mes',
        forWho: 'Para publicar con tu réplica a menudo.',
        pitch: 'El doble de vídeos para estar siempre presente.',
        includes: ['16 vídeos al mes con tu réplica'],
      },
    ],
  },
];

/** Vídeo suelto */
export const SINGLE_VIDEO: Pack = {
  id: 'video-suelto',
  name: 'Vídeo suelto',
  headline: '1 vídeo',
  price: 69,
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

function toPurchasable(pack: Pack, group: string): PurchasablePack {
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
