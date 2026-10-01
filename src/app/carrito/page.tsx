import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import KineticWordmark from '@/components/home/KineticWordmark';
import SiteFooter from '@/components/home/SiteFooter';
import CartLink from '@/components/home/CartLink';
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
      <header className="fixed top-0 inset-x-0 z-40 border-b border-white/10 bg-black/60 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <KineticWordmark name={businessName} className="text-xl" />
          </Link>
          <nav className="flex items-center gap-1 md:gap-2">
            <Link href="/#precios" className="px-3 py-2 min-h-10 inline-flex items-center text-sm text-white/60 hover:text-white transition-colors">
              Seguir comprando
            </Link>
            <CartLink />
          </nav>
        </div>
      </header>

      <main className="relative z-[2] px-4 md:px-8 pt-28 pb-16 md:pt-32 md:pb-24">
        <CartClient />
      </main>

      <SiteFooter businessName={businessName} className="max-w-6xl mx-3 md:mx-auto mt-4 mb-4" />
    </div>
  );
}
