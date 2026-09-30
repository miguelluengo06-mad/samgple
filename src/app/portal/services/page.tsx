'use client';

import { useState } from 'react';
import { useAuth } from '@/components/AuthContext';
import { useProductsContext } from './context';
import type { Product } from './context';
import { Package, Pencil, Trash2, Loader2 } from 'lucide-react';
import ProductFormModal from '@/components/portal/ProductFormModal';

function formatPrice(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

export default function ServicesPage() {
  const { session } = useAuth();
  const { products, loading, refetch } = useProductsContext();
  const [editing, setEditing] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleDelete = async (product: Product) => {
    if (!session?.access_token) return;
    if (!confirm(`¿Eliminar "${product.name}"? No se puede deshacer.`)) return;
    setDeletingId(product.id);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) refetch();
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (product: Product) => {
    if (!session?.access_token) return;
    setTogglingId(product.id);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ active: !product.active }),
      });
      if (res.ok) refetch();
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) return null;

  if (products.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="icon-badge icon-badge-neutral w-16 h-16 rounded-2xl mx-auto mb-4">
            <Package className="w-8 h-8 text-white/90" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Aún no hay productos</h3>
          <p className="text-white/60 text-base max-w-sm">
            Añade tus packages y servicios para que aparezcan en la tienda pública.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 md:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="group card-liquid card-liquid-interactive rounded-xl overflow-hidden"
            >
              <div className="aspect-video bg-gray-800/40 flex items-center justify-center overflow-hidden">
                {product.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="icon-badge icon-badge-neutral w-12 h-12">
                    <Package className="w-6 h-6 text-white/90" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-white truncate">{product.name}</h3>
                  <span className="text-sm font-medium text-white/80 shrink-0">
                    {formatPrice(product.price_cents, product.currency)}
                  </span>
                </div>
                {product.description && (
                  <p className="text-sm text-white/40 line-clamp-2 mb-3">{product.description}</p>
                )}
                <div className="flex items-center justify-between gap-2 mt-3">
                  <button
                    onClick={() => handleToggleActive(product)}
                    disabled={togglingId === product.id}
                    className={`px-2.5 py-0.5 text-xs rounded-full inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                      product.active
                        ? 'bg-olive-500/10 text-olive-400 border border-olive-500/20'
                        : 'bg-gray-800/30 text-gray-400 border border-gray-700'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${product.active ? 'bg-olive-400' : 'bg-gray-500'}`} />
                    {product.active ? 'En tienda' : 'Oculto'}
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditing(product)}
                      className="p-1.5 text-white/40 hover:text-white hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                      title="Editar"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(product)}
                      disabled={deletingId === product.id}
                      className="p-1.5 text-white/40 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                      title="Eliminar"
                    >
                      {deletingId === product.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ProductFormModal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        accessToken={session?.access_token}
        onSuccess={refetch}
        product={editing}
      />
    </div>
  );
}
