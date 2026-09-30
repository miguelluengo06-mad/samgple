'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import { usePortalRoleContext } from '@/app/portal/context';
import { Plus, ExternalLink, CreditCard } from 'lucide-react';
import Link from 'next/link';
import PageHeader from '@/components/portal/PageHeader';
import { supabase } from '@/lib/supabase';
import { ProductsContext } from './context';
import type { Product } from './context';
import ProductFormModal from '@/components/portal/ProductFormModal';

// Module-level cache — survives route navigations within the SPA session
let _productsCache: Product[] | null = null;

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  const { user, session, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = usePortalRoleContext();
  const router = useRouter();

  // Route guard: only the agency (not clients) manages products
  useEffect(() => {
    if (!roleLoading && role === 'client') {
      router.replace('/portal');
    }
  }, [role, roleLoading, router]);

  const [products, setProducts] = useState<Product[]>(_productsCache ?? []);
  const [loading, setLoading] = useState(_productsCache === null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [stripeConnected, setStripeConnected] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('agency_stripe_key_set')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => setStripeConnected(!!data?.agency_stripe_key_set));
  }, [user]);

  const fetchProducts = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const res = await fetch('/api/products', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        _productsCache = data.products || [];
        setProducts(_productsCache!);
      }
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (!authLoading && user) fetchProducts();
  }, [authLoading, user, fetchProducts]);

  if (role === 'client') return null;

  return (
    <ProductsContext.Provider value={{ products, loading, refetch: fetchProducts }}>
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Header bar */}
        <PageHeader
          title="Productos"
          subtitle={products.length > 0 ? `${products.filter((p) => p.active).length} de ${products.length} visibles en la tienda` : undefined}
          actions={
            <>
              <Link
                href="/store"
                target="_blank"
                className="flex items-center gap-1.5 px-3 py-2 border border-white/15 hover:bg-white/5 text-white/60 hover:text-white rounded-lg text-sm font-medium transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="hidden sm:inline">Ver tienda</span>
              </Link>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-olive-500 text-black hover:bg-olive-400 rounded-full text-sm font-medium transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Añadir producto
              </button>
            </>
          }
        />

        {/* Stripe not connected yet — sales won't work without it */}
        {stripeConnected === false && (
          <div className="flex-shrink-0 mx-4 md:mx-6 mt-4 p-3.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-3">
            <CreditCard className="w-4 h-4 text-yellow-400 shrink-0" />
            <p className="text-sm text-yellow-200/80 flex-1">
              Stripe no está conectado — los visitantes no podrán pagar en tu tienda todavía.
            </p>
            <Link
              href="/portal/settings?tab=connections#stripe"
              className="text-sm font-medium text-yellow-300 hover:text-yellow-200 transition-colors whitespace-nowrap"
            >
              Conectar Stripe →
            </Link>
          </div>
        )}

        {/* Content */}
        {children}
      </div>

      <ProductFormModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        accessToken={session?.access_token}
        onSuccess={() => {
          _productsCache = null;
          fetchProducts();
        }}
      />
    </ProductsContext.Provider>
  );
}
