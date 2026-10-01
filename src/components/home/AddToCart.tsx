'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, ShoppingCart } from 'lucide-react';
import { useCart } from '@/lib/useCart';

/** Botón «Añadir al carrito» de las fichas de pack. Tras añadir, enseña un acceso directo al carrito. */
export function AddToCartButton({ packId, className }: { packId: string; className?: string }) {
  const { add, items } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inCart = items.find((i) => i.id === packId)?.qty ?? 0;

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const onClick = () => {
    add(packId);
    setJustAdded(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setJustAdded(false), 2200);
  };

  return (
    <div className="pack-buy">
      <button type="button" onClick={onClick} className={className}>
        {justAdded ? <Check aria-hidden="true" /> : <ShoppingCart aria-hidden="true" />}
        {justAdded ? 'Añadido' : 'Añadir al carrito'}
      </button>
      <p className="pack-buy__status" role="status" aria-live="polite">
        {inCart > 0 && (
          <>
            {inCart} en tu carrito ·{' '}
            <Link href="/carrito" className="underline underline-offset-2">
              Ver carrito
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
