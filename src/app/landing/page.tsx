import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, DM_Sans, Instrument_Serif } from 'next/font/google';
import { ShieldCheck, Smartphone, Target, VideoOff, Wallet, Zap, type LucideIcon } from 'lucide-react';
import LandingScripts from './LandingScripts';
import CookieSettingsLink from '@/components/legal/CookieSettingsLink';
import CartLink from '@/components/home/CartLink';
import Pricing from '@/components/home/Pricing';
import PaymentNotice from '@/components/home/PaymentNotice';
import { EXAMPLE_VIDEOS } from '@/lib/exampleVideos';
import { VAT_LABEL, WEB_PRICING_URL, WELCOME_FAQ, WELCOME_PACK, welcomeSpots } from '@/lib/packs';
import './landing.css';

/*
 * Landing: vídeos, influencers y anuncios con IA para negocios y ecommerce.
 *
 * Los textos entre [CORCHETES] son placeholders a rellenar: [PRECIO], [Nº], [X días],
 * [X horas], [AÑO], [Ventaja extra], los testimonios y las condiciones de permanencia.
 *
 * Fuentes: next/font descarga las fuentes de Google en build y las sirve desde este mismo dominio
 * (la CSP del proyecto solo permite font-src 'self', así que un <link> a fonts.googleapis.com se bloquearía).
 */
const bricolage = Bricolage_Grotesque({ subsets: ['latin'], weight: ['700', '800'], display: 'swap', variable: '--font-bricolage' });
const instrument = Instrument_Serif({ subsets: ['latin'], weight: '400', style: 'italic', display: 'swap', variable: '--font-instrument' });
const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '700'], display: 'swap', variable: '--font-dmsans' });

const TITLE = 'Vídeos, influencers y anuncios con IA para negocios y ecommerce | samgple';
const DESCRIPTION =
  'Vídeos, influencers y anuncios creados con IA, tan realistas que parecen grabados. Listos para tus redes y tus campañas en Meta y TikTok.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    locale: 'es_ES',
    siteName: 'samgple',
    // TODO: images: [{ url: '/landing/og.jpg', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

// The app-wide viewport blocks pinch-zoom; this page must stay zoomable (accessibility).
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#0F0E0D',
};

/* ── Inline stroke icons (decorative → aria-hidden) ── */
function Icon({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <svg className={`lp-icon ${className}`.trim()} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

const Check = () => (
  <Icon>
    <path d="M5 12.5 9.5 17 19 7.5" />
  </Icon>
);

const ArrowRight = () => (
  <Icon>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </Icon>
);

const VolumeOnIcon = () => (
  <Icon className="lp-mute__svg">
    <path d="M4 9.5v5h4l5 4v-13l-5 4H4Z" />
    <path d="M16.5 9a4 4 0 0 1 0 6" />
    <path d="M19 6.5a8 8 0 0 1 0 11" />
  </Icon>
);

const VolumeOffIcon = () => (
  <Icon className="lp-mute__svg">
    <path d="M4 9.5v5h4l5 4v-13l-5 4H4Z" />
    <path d="m16 9 5 6" />
    <path d="m21 9-5 6" />
  </Icon>
);

const CheckCircle = () => (
  <Icon>
    <circle cx="12" cy="12" r="9.5" />
    <path d="m8 12.5 3 3 5-6" />
  </Icon>
);

/**
 * Por qué trabajar con nosotros. Solo hechos de la oferta: nada de cifras de clientes ni años de experiencia inventados.
 */
const WHY: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: VideoOff,
    title: 'Sin cámaras ni actores',
    text: 'No grabas, no sales en cámara y no organizas nada. Nos cuentas tu negocio y tú solo recibes los vídeos.',
  },
  {
    icon: Target,
    title: 'Hechos para vender',
    text: 'Cada vídeo lleva un guion pensado para vender y varios ganchos, para que compruebes cuál funciona mejor.',
  },
  {
    icon: Wallet,
    title: 'Precio claro',
    text: 'Precio cerrado con IVA incluido y sin sorpresas. Pagas online y recibes tu factura. Empiezas con 2 vídeos por 30 €.',
  },
  {
    icon: Zap,
    title: 'Rápido',
    text: 'Recibes tu Pack de Bienvenida en 72 h. Un vídeo suelto, en 5 días.',
  },
  {
    icon: Smartphone,
    title: 'Listos para publicar',
    text: 'Vertical 9:16 con subtítulos, y 1:1 para tu tienda. Para Instagram, TikTok, Facebook y anuncios en Meta y TikTok.',
  },
  {
    icon: ShieldCheck,
    title: 'Siempre la misma cara',
    text: 'Tu influencer es siempre el mismo, con su voz y su estilo. Y tu réplica digital, solo con tu autorización por escrito.',
  },
];

const HERO_CHECKS = ['Ideas y guiones incluidos', 'No tienes que salir en cámara', 'Listos para publicar'];

const EXAMPLES = EXAMPLE_VIDEOS;

const INCLUDES = [
  { title: 'Ideas y guiones', text: 'Sabemos qué contar para que tu cliente se pare a mirar.' },
  { title: 'Personas y escenas realistas', text: 'Presentadores y ambientes creados con IA, sin cámaras ni actores.' },
  { title: 'Voz y subtítulos', text: 'Voz natural en tu idioma y subtítulos para verlo sin sonido.' },
  { title: 'Formato para cada red', text: 'Vertical para Reels y TikTok, cuadrado y horizontal cuando haga falta.' },
  { title: 'Revisiones incluidas', text: '[Nº] rondas de cambios hasta que te encante.' },
  { title: 'Constancia sin esfuerzo', text: 'Contenido nuevo cada mes para que tus redes no se paren.' },
];

const COMPARISON = [
  ['Ideas', 'Te toca pensarlas cada semana', 'Te las damos hechas'],
  ['Grabación', 'Tú delante de la cámara', 'Ni cámara ni actores'],
  ['Creadores', 'Buscar, negociar y esperar entregas', 'Tu influencer IA, siempre disponible'],
  ['Edición', 'Horas aprendiendo programas', 'Lo recibes terminado'],
  ['Constancia', 'Publicas cuando puedes', 'Vídeos nuevos cada mes'],
  ['Tu tiempo', 'Se va en el contenido', 'Vuelve a tu negocio'],
];

const FAQ = [
  {
    q: '¿Se nota que está hecho con IA?',
    a: 'Trabajamos para que parezca grabado de verdad. Mira los ejemplos de arriba y juzga tú.',
  },
  {
    q: '¿Tengo que salir yo en los vídeos?',
    a: 'No. Puedes aparecer si quieres, pero no hace falta que te pongas delante de la cámara.',
  },
  { q: '¿Cuánto tardáis en entregar?', a: 'Los primeros vídeos llegan en [X días] desde la llamada inicial.' },
  { q: '¿Y si un vídeo no me gusta?', a: 'Lo cambiamos. Cada vídeo incluye [Nº] rondas de revisión.' },
  {
    q: '¿Puedo tener un influencer propio para mi marca?',
    a: 'Sí. Creamos un personaje con IA con la misma cara y estilo en todos tus vídeos y anuncios, para que tu tienda tenga su propia imagen.',
  },
  { q: '¿Hay permanencia?', a: '[Explica tus condiciones: mensual, trimestral, cancelación…]' },
];

export default function LandingPage() {
  // Plazas del Pack de Bienvenida: se editan a mano en src/lib/packs.ts → WELCOME_SPOTS_LEFT
  const spots = welcomeSpots();
  const packCtaHref = spots.soldOut ? WEB_PRICING_URL : '#reserva';
  const packCtaLabel = spots.soldOut ? 'Ver todos los packs' : WELCOME_PACK.cta;

  return (
    <div className={`lp mil-bg ${bricolage.variable} ${instrument.variable} ${dmSans.variable}`}>
      {/*
        META PIXEL (opcional). Pega aquí el código base de tu píxel cuando lo tengas — y, como la CSP de
        next.config.ts solo permite scripts propios, añade https://connect.facebook.net a script-src y
        https://www.facebook.com a connect-src / img-src:

          <script dangerouslySetInnerHTML={{ __html: `!function(f,b,e,v,n,t,s){...}(window,document,'script',
            'https://connect.facebook.net/en_US/fbevents.js'); fbq('init','[PIXEL_ID]'); fbq('track','PageView');` }} />

        El evento Lead ya se dispara desde LandingScripts.tsx al enviar el formulario (si window.fbq existe).
      */}

      {/* Barra de progreso de scroll (LandingScripts.tsx actualiza --lp-progress) */}
      <div className="lp-progress" aria-hidden="true" />

      {/* 1 · Header */}
      <header className="lp-header" data-header>
        <div className="lp-container lp-header__inner">
          <a className="lp-logo" href="#inicio" aria-label="samgple, ir al inicio">
            <span className="lp-logo__dot" aria-hidden="true" />
            samgple
          </a>
          <nav className="lp-nav" aria-label="Principal">
            <a href="#por-que">Por qué nosotros</a>
            <a href="#ejemplos">Ejemplos</a>
            <a href="#packs">Packs</a>
            <a href="#como">Cómo funciona</a>
          </nav>
          <CartLink className="lp-cart" />
          <a className="lp-btn lp-btn--primary" href={packCtaHref}>
            <span className="lp-only-desktop">{spots.soldOut ? 'Ver packs' : 'Quiero mi pack'}</span>
            <span className="lp-only-mobile">{spots.soldOut ? 'Packs' : 'Mi pack'}</span>
          </a>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="lp-section lp-hero" id="inicio" aria-labelledby="hero-title">
          <div className="lp-container lp-hero__grid">
            <div>
              <p className="lp-eyebrow">Vídeos con IA para negocios y ecommerce</p>
              <h1 id="hero-title">
                Tu negocio en vídeo. <em className="is-accent">Sin grabar,</em> sin editar, sin pensar ideas.
              </h1>
              <p className="lp-hero__lead">
                Vídeos, influencers y anuncios creados con IA, tan reales que parecen grabados. Listos para Instagram,
                TikTok y tus campañas de Meta. Tú vendes; nosotros ponemos el contenido.
              </p>
              <div className="lp-hero__actions">
                <a className="lp-btn lp-btn--primary lp-btn--lg" href={packCtaHref}>
                  {packCtaLabel} <ArrowRight />
                </a>
                <a className="lp-btn lp-btn--secondary lp-btn--lg" href="#packs">
                  Ver todos los packs
                </a>
              </div>
              <ul className="lp-checks">
                {HERO_CHECKS.map((item) => (
                  <li key={item}>
                    <Check />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="lp-scarcity">
                <span className="lp-scarcity__dot" aria-hidden="true" />
                <span>
                  {spots.soldOut ? (
                    'Pack de Bienvenida agotado'
                  ) : (
                    <>
                      {WELCOME_PACK.name} · {WELCOME_PACK.price} € ({VAT_LABEL}) · Quedan <strong>{spots.left}</strong> de {spots.total} plazas
                    </>
                  )}
                </span>
              </p>
            </div>

            {/* Vídeo vertical 9:16 (380×676 en desktop). data-video-card: LandingScripts.tsx lo reproduce
                mientras está en pantalla y lo pausa al salir; data-try-sound intenta activar el sonido
                nada más entrar en vista (cae a silencio si el navegador lo bloquea). Un único botón
                para silenciar/activar el sonido. */}
            <div className="lp-video" data-video-card data-try-sound="true">
              <video
                src="https://pub-e87160a916994231bb484c99e8e7ef01.r2.dev/videoLANDING1.mp4"
                muted
                loop
                playsInline
                preload="metadata"
                aria-label="Vídeo destacado"
              />
              <button
                type="button"
                className="lp-mute is-muted"
                data-mute-toggle
                aria-pressed="false"
                aria-label="Activar sonido"
              >
                <span className="lp-mute__icon lp-mute__icon--on" aria-hidden="true">
                  <VolumeOnIcon />
                </span>
                <span className="lp-mute__icon lp-mute__icon--off" aria-hidden="true">
                  <VolumeOffIcon />
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* Ejemplos (arriba: es lo que más vende) */}
        <section className="lp-section" id="ejemplos" aria-labelledby="ejemplos-title">
          <div className="lp-container">
            <div className="lp-head" data-reveal>
              <h2 className="lp-head__title" id="ejemplos-title">
                Mira lo que hacemos. <em className="is-accent">¿Adivinas cuál es IA?</em>
              </h2>
            </div>
            <div className="lp-examples">
              {/* TODO: rellena src (MP4 vertical 9:16, ligero) en EXAMPLES; mientras esté vacío se ve el
                  hueco reservado. Con src, el vídeo se reproduce solo al entrar en la sección y se pausa
                  al salir, con un único botón para silenciar/activar el sonido. */}
              {EXAMPLES.map(({ label, src, poster }) => (
                <figure className="lp-example" key={label} data-reveal>
                  <span className="lp-example__tag">{label}</span>
                  {src ? (
                    <div className="lp-video" data-video-card>
                      <video
                        src={src}
                        poster={poster || undefined}
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        aria-label={`Vídeo de ejemplo: ${label}`}
                      />
                      <button
                        type="button"
                        className="lp-mute is-muted"
                        data-mute-toggle
                        aria-pressed="false"
                        aria-label="Activar sonido"
                      >
                        <span className="lp-mute__icon lp-mute__icon--on" aria-hidden="true">
                          <VolumeOnIcon />
                        </span>
                        <span className="lp-mute__icon lp-mute__icon--off" aria-hidden="true">
                          <VolumeOffIcon />
                        </span>
                      </button>
                    </div>
                  ) : (
                    <div className="lp-video lp-video--empty" role="img" aria-label={`Espacio para vídeo: ${label}`}>
                      <span className="lp-video__label">[Vídeo próximamente]</span>
                    </div>
                  )}
                  <figcaption>[Vídeo de ejemplo]</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* Por qué trabajar con nosotros */}
        <section className="lp-section" id="por-que" aria-labelledby="por-que-title">
          <div className="lp-container">
            <div className="lp-head" data-reveal>
              <h2 className="lp-head__title" id="por-que-title">
                Por qué trabajar <em className="is-accent">con nosotros</em>
              </h2>
              <p className="lp-head__side">
                Sabes que necesitas vídeo. El problema es todo lo demás. De todo lo demás nos ocupamos nosotros.
              </p>
            </div>

            <ul className="lp-why">
              {WHY.map(({ icon: WhyIcon, title, text }) => (
                <li className="lp-card lp-why__item" key={title} data-reveal>
                  <span className="lp-card__icon">
                    <WhyIcon strokeWidth={2} aria-hidden="true" />
                  </span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </li>
              ))}
            </ul>

            {/* Precio ancla */}
            <div className="lp-anchor" data-reveal>
              <div className="lp-anchor__side lp-anchor__side--them">
                <span className="lp-anchor__label">Con un creador humano</span>
                <span className="lp-anchor__price">100–400 €</span>
                <span className="lp-anchor__note">por vídeo</span>
              </div>
              <span className="lp-anchor__vs" aria-hidden="true">
                vs
              </span>
              <div className="lp-anchor__side lp-anchor__side--us">
                <span className="lp-anchor__label">Con nosotros · {WELCOME_PACK.name}</span>
                <span className="lp-anchor__price">{WELCOME_PACK.price} €</span>
                <span className="lp-anchor__note">2 vídeos · IVA incluido</span>
              </div>
            </div>
            <p className="lp-anchor__caption">
              {WELCOME_PACK.anchor}. Aquí tienes 2 por {WELCOME_PACK.price} € (IVA incluido).
            </p>

            <p className="lp-why__cta" data-reveal>
              <a className="lp-btn lp-btn--primary lp-btn--lg" href={packCtaHref}>
                {packCtaLabel} <ArrowRight />
              </a>
              <a className="lp-btn lp-btn--secondary lp-btn--lg" href="#packs">
                Ver todos los packs
              </a>
            </p>
          </div>
        </section>

        {/* Pack de Bienvenida — protagonista de la landing */}
        <section className="lp-section lp-section--army lp-pack" id="pack" aria-labelledby="pack-title">
          <div className="lp-container lp-pack__grid">
            <div className="lp-pack__offer" data-reveal>
              <p className="lp-eyebrow">Oferta de entrada · Solo {spots.total} plazas</p>
              <h2 id="pack-title">
                {WELCOME_PACK.name}: <em className="is-accent">2 vídeos de tu producto</em> por {WELCOME_PACK.price} €
              </h2>
              <p className="lp-pack__price">
                <span className="lp-pack__amount">{WELCOME_PACK.price} €</span>
                <span className="lp-pack__iva">{VAT_LABEL}</span>
              </p>
              <p className="lp-pack__anchor">
                {WELCOME_PACK.anchor}. <strong>Aquí tienes 2 por {WELCOME_PACK.price} € ({VAT_LABEL}).</strong>
              </p>
              <ul className="lp-pack__list">
                {WELCOME_PACK.includes.map((item) => (
                  <li key={item}>
                    <Check />
                    {item}
                  </li>
                ))}
              </ul>
              <ul className="lp-pack__conditions" aria-label="Condiciones del pack">
                {WELCOME_PACK.conditions.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <p className="lp-pack__bonus">
                <span className="lp-pack__bonus-tag">Bonus</span>
                {WELCOME_PACK.bonus}
              </p>
            </div>

            <div className="lp-form-card lp-pack__card" id="reserva" data-reveal>
              {/* Contador de plazas: el número sale de src/lib/packs.ts → WELCOME_SPOTS_LEFT (se cambia a mano) */}
              <div className={`lp-meter${spots.left <= 10 ? ' is-low' : ''}`}>
                <p className="lp-meter__label">
                  <span className="lp-meter__dot" aria-hidden="true" />
                  <span>
                    {spots.soldOut ? (
                      'Plazas agotadas'
                    ) : (
                      <>
                        Quedan <strong>{spots.left}</strong> de {spots.total} plazas
                      </>
                    )}
                  </span>
                </p>
                <div className="lp-meter__track" role="img" aria-label={`${spots.taken} de ${spots.total} plazas ya reservadas`}>
                  <span style={{ width: `${(spots.taken / spots.total) * 100}%` }} />
                </div>
              </div>

              {spots.soldOut ? (
                <div className="lp-success">
                  <h3>Plazas agotadas</h3>
                  <p>El Pack de Bienvenida ya no está disponible. Mira el resto de packs.</p>
                  <a className="lp-btn lp-btn--primary lp-btn--lg lp-btn--block" href={WEB_PRICING_URL}>
                    Ver todos los packs
                  </a>
                </div>
              ) : (
                <>
                  <form className="lp-form" id="pack-form" noValidate>
                    <div>
                      <h3 className="lp-pack__form-title">Cuéntanos lo básico y pasa al pago seguro</h3>
                      <p className="lp-pack__form-hint">Son 5 datos y tardas menos de un minuto. Después pagas en Stripe.</p>
                    </div>
                    <div className="lp-field">
                      <label htmlFor="pack-company">Nombre de la empresa</label>
                      <input id="pack-company" name="company" type="text" autoComplete="organization" required aria-describedby="pack-company-error" />
                      <p className="lp-error" id="pack-company-error" data-error-for="company" aria-live="polite" />
                    </div>
                    <div className="lp-field">
                      <label htmlFor="pack-website">Web o tienda</label>
                      <input id="pack-website" name="website" type="text" inputMode="url" autoComplete="url" placeholder="www.mitienda.com" required aria-describedby="pack-website-error" />
                      <p className="lp-error" id="pack-website-error" data-error-for="website" aria-live="polite" />
                    </div>
                    <div className="lp-field">
                      <label htmlFor="pack-product">Producto que quieres promocionar</label>
                      <input id="pack-product" name="product" type="text" required aria-describedby="pack-product-error" />
                      <p className="lp-error" id="pack-product-error" data-error-for="product" aria-live="polite" />
                    </div>
                    <fieldset className="lp-field lp-radios" aria-describedby="pack-ads-error">
                      <legend>¿Ya haces anuncios en redes?</legend>
                      <div className="lp-radios__row">
                        <label className="lp-radio">
                          <input type="radio" name="ads" value="Sí" required />
                          <span>Sí</span>
                        </label>
                        <label className="lp-radio">
                          <input type="radio" name="ads" value="No" required />
                          <span>No</span>
                        </label>
                      </div>
                      <p className="lp-error" id="pack-ads-error" data-error-for="ads" aria-live="polite" />
                    </fieldset>
                    <div className="lp-field">
                      <label htmlFor="pack-phone">Tu WhatsApp</label>
                      <input id="pack-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+34 600 000 000" required aria-describedby="pack-phone-error" />
                      <p className="lp-error" id="pack-phone-error" data-error-for="phone" aria-live="polite" />
                    </div>
                    {/* Honeypot anti-spam: hidden from people, bots fill it and the server drops the lead */}
                    <div className="lp-hp" aria-hidden="true">
                      <label htmlFor="pack-website-hp">No rellenar</label>
                      <input id="pack-website-hp" name="hp" type="text" tabIndex={-1} autoComplete="off" />
                    </div>
                    <button type="submit" className="lp-btn lp-btn--primary lp-btn--lg lp-btn--block">
                      Continuar al pago · {WELCOME_PACK.price} € ({VAT_LABEL})
                    </button>
                    <p className="lp-form__note">Todavía no pagas nada: el pago es el siguiente paso, en una pantalla segura de Stripe.</p>
                  </form>

                  <div className="lp-success" data-pack-success hidden tabIndex={-1} role="status">
                    <CheckCircle />
                    <h3>
                      ¡Genial, <span data-pack-name>tu empresa</span>!
                    </h3>
                    <p data-pack-fallback>Ya tenemos tus datos. Último paso: completa el pago para reservar tu plaza.</p>
                    {/* Normalmente el cliente pasa directo a Stripe. Este botón aparece si el pago no pudo abrirse solo. */}
                    <button type="button" className="lp-btn lp-btn--primary lp-btn--lg lp-btn--block" data-pay-retry>
                      Ir al pago · {WELCOME_PACK.price} € ({VAT_LABEL})
                    </button>
                    <p className="lp-error" data-pay-error aria-live="polite" />
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Preguntas frecuentes del Pack de Bienvenida */}
        <section className="lp-section" id="pack-faq" aria-labelledby="pack-faq-title">
          <div className="lp-container lp-faq">
            <h2 id="pack-faq-title" data-reveal>
              Preguntas sobre el pack
            </h2>
            <div className="lp-faq__list" data-reveal>
              {WELCOME_FAQ.map((item, i) => (
                <details key={item.q} open={i === 0}>
                  <summary>
                    {item.q}
                    <Icon>
                      <path d="M5 12h14" />
                      <path className="lp-plus-v" d="M12 5v14" />
                    </Icon>
                  </summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Elige tu pack — catálogo completo (mismas fichas que en la web) */}
        <section className="lp-section" id="packs" aria-labelledby="precios-title">
          <Pricing variant="landing" />
        </section>

        {/* Comparativa */}
        <section className="lp-section" id="comparativa" aria-labelledby="comparativa-title">
          <div className="lp-container">
            <div className="lp-head" data-reveal>
              <h2 className="lp-head__title" id="comparativa-title">
                Hacerlo tú <em className="is-soft">vs.</em> dejárnoslo a nosotros
              </h2>
            </div>
            <div className="lp-table-wrap" data-reveal>
              <table className="lp-table">
                <colgroup>
                  <col className="lp-table__concept" />
                  <col />
                  <col />
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col" className="lp-table__concept">
                      <span className="lp-sr-only">Concepto</span>
                    </th>
                    <th scope="col">Hacerlo tú</th>
                    <th scope="col" className="lp-table__us">
                      Con samgple
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map(([concept, you, us]) => (
                    <tr key={concept}>
                      <th scope="row" className="lp-table__concept">
                        {concept}
                      </th>
                      <td>{you}</td>
                      <td className="lp-table__us">{us}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Cómo funciona */}
        <section className="lp-section" id="como" aria-labelledby="como-title">
          <div className="lp-container">
            <div className="lp-head" data-reveal>
              <h2 className="lp-head__title" id="como-title">
                De cero a vídeos publicados en <em className="is-accent">3 pasos</em>
              </h2>
              <p className="lp-head__side">Tu única tarea es contarnos cómo es tu negocio y dar el visto bueno.</p>
            </div>
            <ol className="lp-steps">
              <li className="lp-step" data-reveal>
                <div className="lp-step__num" aria-hidden="true">01</div>
                <h3>Nos cuentas tu negocio</h3>
                <p>Una llamada corta para entender qué vendes, a quién y cómo hablas.</p>
              </li>
              <li className="lp-step" data-reveal>
                <div className="lp-step__num" aria-hidden="true">02</div>
                <h3>Creamos ideas, guiones y vídeos</h3>
                <p>Pensamos qué contar y producimos los vídeos con IA hiperrealista.</p>
              </li>
              <li className="lp-step" data-reveal>
                <div className="lp-step__num" aria-hidden="true">03</div>
                <h3>Los recibes y publicas</h3>
                <p>Te llegan listos, con subtítulos y en el formato de cada red.</p>
              </li>
            </ol>
          </div>
        </section>

        {/* Testimonios */}
        <section className="lp-section" id="testimonios" aria-labelledby="testimonios-title">
          <div className="lp-container">
            <div className="lp-head" data-reveal>
              <h2 className="lp-head__title" id="testimonios-title">
                Lo que dicen nuestros clientes
              </h2>
            </div>
            <div className="lp-testimonials">
              {[0, 1, 2].map((i) => (
                <figure className="lp-testimonial" key={i} data-reveal>
                  <blockquote className="lp-quote">
                    «[Testimonio real de un cliente: qué problema tenía y qué cambió.]»
                  </blockquote>
                  <figcaption className="lp-person">
                    <span className="lp-avatar" aria-hidden="true" />
                    <span>
                      <span className="lp-person__name">[Nombre]</span>
                      <br />
                      <span className="lp-person__meta">[Negocio · Ciudad]</span>
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ general */}
        <section className="lp-section" id="faq" aria-labelledby="faq-title">
          <div className="lp-container lp-faq">
            <h2 id="faq-title" data-reveal>
              Preguntas frecuentes
            </h2>
            <div className="lp-faq__list" data-reveal>
              {FAQ.map((item, i) => (
                <details key={item.q} open={i === 0}>
                  <summary>
                    {item.q}
                    <Icon>
                      <path d="M5 12h14" />
                      <path className="lp-plus-v" d="M12 5v14" />
                    </Icon>
                  </summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final + formulario general */}
        <section className="lp-section lp-section--army" id="empezar" aria-labelledby="empezar-title">
          <div className="lp-container lp-cta">
            <div data-reveal>
              <h2 id="empezar-title">
                Tus próximos vídeos <em className="is-accent">ya no dependen de ti.</em>
              </h2>
              <p className="lp-cta__lead">
                Déjanos tus datos y te llamamos para ver qué vídeos necesita tu negocio. Sin compromiso.
              </p>
            </div>

            <div className="lp-form-card" data-reveal>
              <form className="lp-form" id="lead-form" noValidate>
                <div className="lp-field">
                  <label htmlFor="lead-name">Nombre</label>
                  <input
                    id="lead-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    aria-describedby="lead-name-error"
                  />
                  <p className="lp-error" id="lead-name-error" data-error-for="name" aria-live="polite" />
                </div>
                <div className="lp-field">
                  <label htmlFor="lead-phone">WhatsApp</label>
                  <input
                    id="lead-phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="+34 600 000 000"
                    required
                    aria-describedby="lead-phone-error"
                  />
                  <p className="lp-error" id="lead-phone-error" data-error-for="phone" aria-live="polite" />
                </div>
                <div className="lp-field">
                  <label htmlFor="lead-business">¿Qué tipo de negocio tienes?</label>
                  <input
                    id="lead-business"
                    name="business"
                    type="text"
                    autoComplete="organization"
                    placeholder="Ej.: tienda online, clínica, restaurante…"
                  />
                </div>
                <div className="lp-field">
                  <label htmlFor="lead-interest">¿Qué te interesa?</label>
                  <input
                    id="lead-interest"
                    name="interest"
                    type="text"
                    placeholder="Vídeos para redes, influencer IA, anuncios…"
                  />
                </div>
                {/* Honeypot anti-spam: hidden from people, bots fill it and the server drops the lead */}
                <div className="lp-hp" aria-hidden="true">
                  <label htmlFor="lead-website">No rellenar</label>
                  <input id="lead-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
                </div>
                <button type="submit" className="lp-btn lp-btn--primary lp-btn--lg lp-btn--block">
                  Quiero mis primeros vídeos
                </button>
                <p className="lp-form__note">Te contactamos en menos de [X horas].</p>
              </form>

              <div className="lp-success" data-success hidden tabIndex={-1} role="status">
                <CheckCircle />
                <h3>¡Recibido!</h3>
                <p>Te contactamos en menos de [X horas].</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 13 · Footer */}
      <footer className="lp-footer">
        <div className="lp-container lp-footer__inner">
          <p>© {new Date().getFullYear()} samgple</p>
          <nav aria-label="Legal">
            <a href="/aviso-legal">Aviso legal</a>
            <a href="/privacidad">Privacidad</a>
            <a href="/cookies">Cookies</a>
            <a href="/terminos">Términos</a>
            <CookieSettingsLink className="lp-footer__btn" />
          </nav>
        </div>
      </footer>

      {/* Solo móvil: barra fija inferior. Se oculta cuando el formulario del pack (#reserva) o el final (#empezar) están a la vista. */}
      <div className="lp-mobile-bar" data-mobile-bar>
        <a className="lp-btn lp-btn--primary lp-btn--lg lp-btn--block" href={packCtaHref}>
          {packCtaLabel}
        </a>
      </div>

      <PaymentNotice />
      <LandingScripts />
    </div>
  );
}
