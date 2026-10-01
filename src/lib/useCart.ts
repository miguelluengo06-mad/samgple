'use client';

import { useCallback, useEffect, useState } from 'react';
import { CART_MAX_QTY, cartCount, sanitizeCart, type CartItem } from '@/lib/cart';

const KEY = 'samgple_cart';
const EVENT = 'cart-change';

function read(): CartItem[] {
  try {
    return sanitizeCart(JSON.parse(localStorage.getItem(KEY) || '[]'));
  } catch {
    return [];
  }
}

function write(items: CartItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* sin almacenamiento: el carrito vive solo mientras la página siga abierta */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Vacía el carrito desde cualquier sitio (p. ej. al confirmar el pago en /gracias). */
export function clearCart() {
  write([]);
}

/** Carrito guardado en el navegador y compartido entre pestañas y componentes. `ready` es false hasta leerlo. */
export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setItems(read());
    sync();
    setReady(true);
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const add = useCallback((id: string) => {
    const current = read();
    const found = current.find((i) => i.id === id);
    write(sanitizeCart(found ? current.map((i) => (i.id === id ? { ...i, qty: i.qty + 1 } : i)) : [...current, { id, qty: 1 }]));
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    const next = Math.min(CART_MAX_QTY, Math.floor(qty));
    write(sanitizeCart(read().map((i) => (i.id === id ? { ...i, qty: next } : i)).filter((i) => i.qty >= 1)));
  }, []);

  const remove = useCallback((id: string) => write(read().filter((i) => i.id !== id)), []);

  return { items, count: cartCount(items), ready, add, setQty, remove, clear: clearCart };
}
