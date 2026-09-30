'use client';

import { createContext, useContext } from 'react';

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  image_url: string | null;
  active: boolean;
  display_order: number;
}

interface ProductsContextValue {
  products: Product[];
  loading: boolean;
  refetch: () => Promise<void>;
}

export const ProductsContext = createContext<ProductsContextValue>({
  products: [],
  loading: true,
  refetch: async () => {},
});

export function useProductsContext() {
  return useContext(ProductsContext);
}
