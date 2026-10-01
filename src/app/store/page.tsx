'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import SiteFooter from '@/components/home/SiteFooter';
import CartLink from '@/components/home/CartLink';
import { Package, Loader2, CheckCircle, ArrowUpRight } from 'lucide-react';
import KineticWordmark from '@/components/home/KineticWordmark';
import { BookCallButton } from '@/components/home/BookCall';

interface StoreProduct {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  image_url: string | null;
}

function formatPrice(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

export default function StorePage() {
  return (
    <Suspense fallback={null}>
      <StorePageInner />
    </Suspense>
  );
}

function StorePageInner() {
  const searchParams = useSearchParams();
  const [businessName, setBusinessName] = useState('samgple');
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const success = searchParams?.get('success') === '1';
  const canceled = searchParams?.get('canceled') === '1';

  useEffect(() => {
    fetch('/api/public/branding')
      .then((r) => r.json())
      .then((data) => { if (data.business_name) setBusinessName(data.business_name); })
      .catch(() => {});
    fetch('/api/public/products')
      .then((r) => r.json())
      .then((data) => setProducts(data.products || []))
      .catch(() => setError('Failed to load products'))
      .finally(() => setLoading(false));
  }, []);

  const handleBuy = async (product: StoreProduct) => {
    setBuyingId(product.id);
    setError(null);
    try {
      const res = await fetch('/api/public/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Failed to start checkout');
      }
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message || 'Failed to start checkout');
      setBuyingId(null);
    }
  };

  return (
    <div className="home-root min-h-screen relative">
      {/* Nav — same treatment as the homepage */}
      <header className="fixed top-0 inset-x-0 z-40 border-b border-white/10 bg-black/60 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <KineticWordmark name={businessName} className="text-xl" />
          </Link>
          <nav className="flex items-center gap-1 md:gap-2">
            <Link href="/#servicios" className="hidden sm:inline-block px-3 py-2 text-sm text-white/60 hover:text-white transition-colors">
              Servicios
            </Link>
            <Link href="/#casos" className="hidden sm:inline-block px-3 py-2 text-sm text-white/60 hover:text-white transition-colors">
              Casos
            </Link>
            <Link href="/auth" className="px-3 py-2 text-sm text-white/60 hover:text-white transition-colors">
              Acceder
            </Link>
            <CartLink />
            <BookCallButton className="ml-1 px-4 py-2 min-h-10 inline-flex items-center rounded-full bg-[var(--signal)] text-black text-sm font-medium hover:bg-[var(--signal-dim)] transition-colors whitespace-nowrap">
              <span className="sm:hidden">Agendar</span>
              <span className="hidden sm:inline">Agendar llamada</span>
            </BookCallButton>
          </nav>
        </div>
      </header>

      <main className="home-slab relative z-[2] max-w-6xl mx-3 md:mx-auto mt-24 md:mt-28 px-5 md:px-10 pt-12 pb-16 md:pt-16 md:pb-24">
        <div className="mb-14">
          <span className="text-xs tracking-[0.25em] uppercase text-[var(--signal)]">Precios</span>
          <h1 className="font-kinetic font-black uppercase text-4xl md:text-6xl leading-none mt-4 mb-4">
            Packages
          </h1>
          <p className="text-white/50 max-w-lg">
            Elige un package y paga de forma segura — o agenda una llamada y te preparamos algo a medida.
          </p>
        </div>

        {success && (
          <div className="max-w-md mb-10 p-4 rounded-xl bg-olive-900/20 border border-olive-800 text-olive-300 flex items-center gap-2 text-sm">
            <CheckCircle className="w-5 h-5 shrink-0" />
            ¡Pago realizado! Nos pondremos en contacto contigo en breve.
          </div>
        )}
        {canceled && (
          <div className="max-w-md mb-10 p-4 card-liquid rounded-xl text-white/60 text-sm text-center">
            Compra cancelada — no se ha realizado ningún cargo.
          </div>
        )}
        {error && (
          <div className="max-w-md mb-10 p-4 rounded-xl bg-red-900/20 border border-red-800 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-white/40" />
          </div>
        ) : products.length === 0 ? (
          <div className="card-liquid rounded-2xl p-10 text-center max-w-lg">
            <div className="icon-badge icon-badge-olive w-14 h-14 mb-5">
              <Package className="w-6 h-6 text-white/90" />
            </div>
            <p className="text-white/60 mb-6">Aún no hay packages publicados — vuelve pronto o agenda una llamada y te preparamos algo a medida.</p>
            <BookCallButton className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--signal)] text-black hover:bg-[var(--signal-dim)] transition-colors text-sm font-medium">
              Agenda una llamada
              <ArrowUpRight className="w-4 h-4" />
            </BookCallButton>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {products.map((product) => (
              <div
                key={product.id}
                className="card-liquid card-liquid-interactive rounded-2xl overflow-hidden flex flex-col"
              >
                <div className="aspect-video bg-white/5 flex items-center justify-center overflow-hidden">
                  {product.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="icon-badge icon-badge-olive w-12 h-12">
                      <Package className="w-6 h-6 text-white/90" />
                    </div>
                  )}
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-kinetic uppercase text-base mb-1">{product.name}</h3>
                  {product.description && (
                    <p className="text-sm text-white/50 mb-4 flex-1">{product.description}</p>
                  )}
                  <div className="flex items-center justify-between gap-3 mt-auto pt-2">
                    <span className="font-serif-display italic text-2xl text-[var(--signal)]">
                      {formatPrice(product.price_cents, product.currency)}
                    </span>
                    <button
                      onClick={() => handleBuy(product)}
                      disabled={buyingId === product.id}
                      className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--signal)] text-black hover:bg-[var(--signal-dim)] disabled:opacity-50 transition-colors text-sm font-medium cursor-pointer"
                    >
                      {buyingId === product.id && <Loader2 className="w-4 h-4 animate-spin" />}
                      Comprar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <SiteFooter businessName={businessName} className="max-w-6xl mx-3 md:mx-auto mt-4 mb-4" />
    </div>
  );
}
