import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import SiteNav from '@/components/home/SiteNav';
import SiteFooter from '@/components/home/SiteFooter';
import CartClient from './CartClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tu carrito',
  robots: { index: false, follow: false },
};

async function getBusinessName() {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('business_name')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.business_name || 'samgple';
}

export default async function CartPage() {
  const businessName = await getBusinessName();
  return (
    <div className="home-root min-h-screen relative">
      <SiteNav businessName={businessName} items={[{ href: '/#precios', label: 'Seguir comprando' }]} />

      <main id="contenido" className="relative z-[2]">
        <section className="ink ink-glow px-5 md:px-10 pt-32 md:pt-40 pb-24 md:pb-32">
          <div className="max-w-[1320px] mx-auto">
            <span className="kicker">/ Hoja de pedido</span>
            <h1 className="display-lg mt-5">
              Tu <em>carrito</em>
            </h1>
          </div>
        </section>

        <section className="px-5 md:px-10 pb-24 md:pb-32 -mt-12 md:-mt-16 relative z-[3]">
          <CartClient />
        </section>
      </main>

      <SiteFooter businessName={businessName} />
    </div>
  );
}
