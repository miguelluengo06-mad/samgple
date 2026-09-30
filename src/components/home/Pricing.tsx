'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, BadgeCheck, Check, Lock, Receipt } from 'lucide-react';
import { BookCallButton } from './BookCall';
import { BuyButton } from './BuyPack';
import PackCover from './PackCover';
import {
  EXTRAS,
  PACK_GROUPS,
  PRICES_NOTE,
  SINGLE_VIDEO,
  WELCOME_PACK,
  formatAmount,
  unitLabel,
  welcomeSpots,
  type Pack,
} from '@/lib/packs';

/**
 * "Servicios y precios" — catálogo de packs con fichas de producto y compra con Stripe.
 * Los datos salen de src/lib/packs.ts (cambia allí un precio o un texto y se actualiza aquí, en la landing
 * y en lo que se cobra). Todos los precios llevan IVA incluido.
 */

type Variant = 'web' | 'landing';

const GRID_COLS: Record<number, string> = {
  1: 'sm:grid-cols-1',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 xl:grid-cols-4',
};

const TABS = [{ id: 'all', label: 'Todos' }, ...PACK_GROUPS.map((g) => ({ id: g.id, label: g.short })), { id: 'suelto', label: 'Suelto y extras' }];

function terms(pack: Pack): string {
  if (pack.unit === 'month') return `Se cobra cada mes${pack.commitment ? ` · ${pack.commitment}` : ''}`;
  if (pack.unit === 'video') return 'Pago único por vídeo';
  return 'Pago único';
}

function ProductCard({ pack, kind, chip, group, variant }: { pack: Pack; kind: string; chip: string; group: string; variant: Variant }) {
  const unit = unitLabel(pack.unit);
  const choice = `${group} · ${pack.name}`;
  const returnPath = variant === 'landing' ? '/landing#packs' : '/#precios';

  return (
    <article className={`pack-card${pack.featured ?? !!pack.badge ? ' pack-card--featured' : ''}`}>
      <PackCover kind={kind} chip={chip} headline={pack.headline} badge={pack.badge} />
      <div className="pack-card__body">
        <h4 className="pack-card__name">{pack.name}</h4>
        <p className="pack-card__lead">{pack.pitch}</p>
        <p className="pack-card__ideal">{pack.forWho}</p>

        <div className="pack-card__price">
          <span className="pack-card__amount">{formatAmount(pack.price)} €</span>
          {unit && <span className="pack-card__unit">{unit}</span>}
        </div>
        {pack.perUnit && (
          <p className="pack-card__per">
            <strong>{pack.perUnit}</strong> por vídeo
          </p>
        )}
        <p className="pack-card__terms">{terms(pack)}</p>
        {pack.priceNote && <p className="pack-card__note">{pack.priceNote}</p>}

        <ul className="pack-card__list">
          {pack.includes.map((item) => (
            <li key={item}>
              <Check aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <div className="pack-card__actions">
          <BuyButton packId={pack.id} returnPath={returnPath} className="pack-card__cta" />
          <p className="pack-card__secure">
            <Lock aria-hidden="true" /> Pago seguro con Stripe · Factura incluida
          </p>
          {variant === 'landing' ? (
            // En la landing lleva al formulario final y le pasa el pack elegido (lo rellena LandingScripts)
            <a href="#empezar" data-pack-choice={choice} className="pack-card__alt">
              Prefiero hablar antes
            </a>
          ) : (
            <BookCallButton pack={choice} className="pack-card__alt">
              Prefiero hablar antes
            </BookCallButton>
          )}
        </div>
      </div>
    </article>
  );
}

function TrustRow() {
  return (
    <ul className="pack-trust" aria-label="Cómo se paga">
      <li>
        <Lock aria-hidden="true" /> Pago seguro con Stripe
      </li>
      <li>
        <BadgeCheck aria-hidden="true" /> {PRICES_NOTE}
      </li>
      <li>
        <Receipt aria-hidden="true" /> Factura con IVA desglosado
      </li>
    </ul>
  );
}

export default function Pricing({ variant = 'web' }: { variant?: Variant }) {
  const spots = welcomeSpots();
  const [tab, setTab] = useState('all');
  const show = (id: string) => tab === 'all' || tab === id;
  const isLanding = variant === 'landing';
  const h2Class = isLanding ? '' : 'font-kinetic font-black uppercase text-4xl md:text-6xl leading-none mt-4';
  const h3Class = isLanding ? 'pack-group-title' : 'font-kinetic font-black uppercase text-2xl md:text-4xl leading-tight';
  const Wrapper = isLanding ? 'div' : 'section';

  return (
    <Wrapper
      id={isLanding ? undefined : 'precios'}
      className={isLanding ? 'lp-container' : 'px-4 md:px-8 py-16 md:py-24'}
      {...(isLanding ? {} : { 'aria-labelledby': 'precios-title' })}
    >
      <div className={isLanding ? '' : 'max-w-6xl mx-auto'}>
        <div className="mb-8 md:mb-10 max-w-3xl">
          <span className="text-xs tracking-[0.25em] uppercase text-[var(--signal)]">Servicios y precios</span>
          <h2 id="precios-title" className={h2Class} {...(isLanding ? { style: { marginTop: 16 } } : {})}>
            Elige tu pack y empieza hoy
          </h2>
          <p className="text-white/60 mt-4 text-base md:text-lg">
            Precio cerrado y sin sorpresas. Pagas online con tarjeta, recibes tu factura y nosotros nos ponemos manos a la obra.
          </p>
        </div>
        <div className="mb-10 md:mb-12">
          <TrustRow />
        </div>

        {/* Pack de Bienvenida → landing (ficha destacada). En la landing ya tiene su propia sección justo encima. */}
        {!isLanding && (
          <article className="pack-card pack-card--wide pack-card--featured mb-12 md:mb-16">
            <PackCover kind="welcome" chip="Oferta de entrada" headline="2 vídeos de tu producto" badge={spots.soldOut ? 'Agotado' : `Quedan ${spots.left}`} />
            <div className="pack-card__body">
              <h3 className="pack-card__name" style={{ fontSize: 22 }}>{WELCOME_PACK.name}</h3>
              <p className="pack-card__lead">Prueba los vídeos con IA en tu producto por muy poco. Una sola vez por empresa.</p>
              <div className="pack-card__price">
                <span className="pack-card__amount">{WELCOME_PACK.price} €</span>
              </div>
              <p className="pack-card__note">
                {spots.soldOut ? 'Plazas agotadas' : `Solo ${spots.total} plazas · quedan ${spots.left}`}
              </p>
              <ul className="pack-card__list">
                {['1 vídeo base con 2 ganchos', 'Guion pensado para vender', 'Formato 9:16 con subtítulos', 'Entrega en 72 h'].map((item) => (
                  <li key={item}>
                    <Check aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/landing#pack" className="pack-card__cta pack-card__cta--link">
                Ver la oferta <ArrowUpRight aria-hidden="true" />
              </Link>
            </div>
          </article>
        )}

        {/* Catalog filters */}
        <div className="pack-tabs mb-10 md:mb-14" role="tablist" aria-label="Filtrar por tipo de servicio">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className="pack-tab">
              {t.label}
            </button>
          ))}
        </div>

        <div className="space-y-16 md:space-y-24">
          {PACK_GROUPS.filter((g) => show(g.id)).map((group) => (
            <div key={group.id} id={`pack-${group.id}`} className="scroll-mt-28">
              <h3 className={h3Class}>{group.title}</h3>
              <p className="text-white/60 mt-2 mb-8 max-w-2xl">{group.tagline}</p>

              <div className={`grid gap-5 md:gap-6 ${GRID_COLS[Math.min(group.packs.length, 4)]}`}>
                {group.packs.map((pack) => (
                  <ProductCard key={pack.id} pack={pack} kind={group.id} chip={group.short} group={group.title} variant={variant} />
                ))}
              </div>

              {group.conditions && (
                <ul className="flex flex-wrap gap-2 mt-6">
                  {group.conditions.map((c) => (
                    <li key={c} className="px-3 py-1.5 rounded-full border border-white/20 text-sm text-white/70">
                      {c}
                    </li>
                  ))}
                </ul>
              )}
              {group.notice && (
                <p className="mt-6 rounded-2xl border border-[var(--signal)]/50 bg-[var(--signal)]/10 px-4 py-3 text-sm max-w-2xl">
                  {group.notice}
                </p>
              )}
            </div>
          ))}

          {/* Vídeo suelto + extras */}
          {show('suelto') && (
            <div id="pack-suelto" className="scroll-mt-28">
              <h3 className={h3Class}>Vídeo suelto y extras</h3>
              <p className="text-white/60 mt-2 mb-8 max-w-2xl">¿Solo necesitas una pieza? ¿O quieres ajustar tu pack? Aquí lo tienes.</p>
              <div className="grid gap-5 md:gap-6 sm:grid-cols-2">
                <ProductCard pack={SINGLE_VIDEO} kind="suelto" chip="Vídeo suelto" group="Vídeo suelto" variant={variant} />
                <article className="pack-card">
                  <PackCover kind="suelto" chip="Extras" headline="Ajusta tu pack" />
                  <div className="pack-card__body">
                    <h4 className="pack-card__name">Extras</h4>
                    <p className="pack-card__lead">Añade lo que necesites a tu pack.</p>
                    <ul className="mt-4 divide-y divide-white/10">
                      {EXTRAS.map((extra) => (
                        <li key={extra.name} className="flex items-baseline justify-between gap-4 py-3.5">
                          <span className="text-[15px]">{extra.name}</span>
                          <span className="font-extrabold tabular-nums whitespace-nowrap text-lg">
                            {extra.price}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className="pack-card__terms" style={{ marginTop: 16 }}>Se piden al contratar tu pack.</p>
                  </div>
                </article>
              </div>
            </div>
          )}
        </div>

        <div className="mt-16 md:mt-24 flex flex-col md:flex-row md:items-center justify-between gap-5 border-t border-white/10 pt-8">
          <p className="text-white/70 max-w-lg">¿No sabes cuál elegir? Cuéntanos tu caso y te recomendamos el pack que mejor te encaja.</p>
          {isLanding ? (
            <a
              href="#empezar"
              className="inline-flex items-center justify-center gap-2 min-h-12 px-6 rounded-full bg-[var(--signal)] text-black text-sm font-semibold hover:bg-[var(--signal-dim)] transition-colors"
            >
              Que me recomienden un pack
            </a>
          ) : (
            <BookCallButton className="inline-flex items-center justify-center gap-2 min-h-12 px-6 rounded-full bg-[var(--signal)] text-black text-sm font-semibold hover:bg-[var(--signal-dim)] transition-colors">
              Agendar llamada
            </BookCallButton>
          )}
        </div>
      </div>
    </Wrapper>
  );
}
