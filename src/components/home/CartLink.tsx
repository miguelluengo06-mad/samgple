'use client';

import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/lib/useCart';

/** Icono de carrito con el número de unidades, para las cabeceras. */
export default function CartLink({ className }: { className?: string }) {
  const { count } = useCart();
  return (
    <Link
      href="/carrito"
      aria-label={count > 0 ? `Carrito, ${count} ${count === 1 ? 'producto' : 'productos'}` : 'Carrito vacío'}
      className={className ?? 'relative inline-flex items-center justify-center w-10 h-10 rounded-full text-white/70 hover:text-white transition-colors'}
    >
      <ShoppingCart className="w-5 h-5" aria-hidden="true" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--signal)] text-black text-[11px] font-bold leading-[18px] text-center tabular-nums">
          {count}
        </span>
      )}
    </Link>
  );
}
