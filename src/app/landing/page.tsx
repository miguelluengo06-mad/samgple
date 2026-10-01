import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, DM_Sans, Instrument_Serif } from 'next/font/google';
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

const HERO_CHECKS = ['Guiones que apruebas antes de producir', 'No tienes que salir en cámara', 'Listos para publicar'];

const EXAMPLES = EXAMPLE_VIDEOS;

const FAQ = [
  {
    q: '¿Se nota que está hecho con IA?',
    a: 'Trabajamos para que parezca grabado de verdad. Mira los ejemplos de arriba y juzga tú.',
  },
  {
    q: '¿Tengo que salir yo en los vídeos?',
    a: 'No. Puedes aparecer si quieres, pero no hace falta que te pongas delante de la cámara.',
  },
  {
    q: '¿Quién decide qué se cuenta en los vídeos?',
    a: 'Tú. Escribimos los guiones tras un brief contigo, te los enviamos y no producimos nada hasta que das el visto bueno.',
  },
  {
    q: '¿Y si no me convence un guion o un vídeo?',
    a: 'Lo cambiamos. Puedes pedir cambios en el guion antes de producir y, después, una ronda de ajustes sobre el vídeo. Las rondas de cada pack están en su ficha.',
  },
  {
    q: '¿Cuánto tardáis en entregar?',
    a: 'Cada pack indica su plazo en su ficha. En los packs con guion a medida, el plazo cuenta desde que apruebas el guion. Un vídeo suelto, en 5 días.',
  },
  {
    q: '¿Puedo tener un influencer propio para mi marca?',
    a: 'Sí. Creamos un personaje con IA con la misma cara y estilo en todos tus vídeos y anuncios, para que tu tienda tenga su propia imagen.',
  },
  { q: '¿Hay permanencia?', a: 'No. Los packs son de pago único, sin suscripción ni permanencia.' },
];

export default function LandingPage() {
  // Plazas del Pack de Bienvenida: se editan a mano en src/lib/packs.ts → WELCOME_SPOTS_LEFT
  const spots = welcomeSpots();
  const packCtaHref = spots.soldOut ? WEB_PRICING_URL : '#reserva';
  const packCtaLabel = spots.soldOut ? 'Ver todos los packs' : WELCOME_PACK.cta;

  return (
    <div className={`lp mil-bg ${bricolage.variable} ${instrument.variable} ${dmSans.variable}`}>

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
            <a href="#ejemplos">Ejemplos</a>
            <a href="#como">Cómo trabajamos</a>
            <a href="#packs">Packs</a>
            <a href="#faq">Preguntas</a>
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
                Tu negocio en vídeo. <em className="is-accent">Sin grabar,</em> sin editar y con guiones que tú apruebas.
              </h1>
              <p className="lp-hero__lead">
                Vídeos, influencers y anuncios creados con IA, tan reales que parecen grabados. Listos para Instagram,
                TikTok y tus campañas de Meta. Escribimos los guiones contigo y no producimos nada sin tu visto bueno.
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

        {/* Cómo trabajamos: el cliente aprueba el guion antes de producir */}
        <section className="lp-section" id="como" aria-labelledby="como-title">
          <div className="lp-container">
            <div className="lp-head" data-reveal>
              <h2 className="lp-head__title" id="como-title">
                Tú das el visto bueno. <em className="is-accent">Nada se produce sin él.</em>
              </h2>
              <p className="lp-head__side">
                Los guiones los escribimos contigo y los apruebas antes de producir. Así los vídeos dicen lo que tu
                marca quiere decir.
              </p>
            </div>
            <ol className="lp-steps lp-steps--4">
              <li className="lp-step" data-reveal>
                <div className="lp-step__num" aria-hidden="true">01</div>
                <h3>Nos cuentas tu negocio</h3>
                <p>Un brief corto: qué vendes, a quién y cómo hablas. Con eso escribimos tus guiones.</p>
              </li>
              <li className="lp-step" data-reveal>
                <div className="lp-step__num" aria-hidden="true">02</div>
                <h3>Revisas y apruebas el guion</h3>
                <p>Te enviamos los guiones, pides los cambios que quieras y no producimos hasta que los apruebes.</p>
              </li>
              <li className="lp-step" data-reveal>
                <div className="lp-step__num" aria-hidden="true">03</div>
                <h3>Producimos tus vídeos</h3>
                <p>Con el guion aprobado, creamos los vídeos con IA, con voz, subtítulos y el formato de cada red.</p>
              </li>
              <li className="lp-step" data-reveal>
                <div className="lp-step__num" aria-hidden="true">04</div>
                <h3>Ajustamos y publicas</h3>
                <p>Revisas los vídeos, te los ajustamos y los recibes listos para publicar.</p>
              </li>
            </ol>
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
                Tus próximos vídeos, <em className="is-accent">con tu visto bueno.</em>
              </h2>
              <p className="lp-cta__lead">
                Déjanos tus datos y te llamamos para ver qué vídeos necesita tu negocio y escribir los guiones contigo. Sin compromiso.
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
