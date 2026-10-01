'use client';

import { useEffect, useRef } from 'react';
import { metaTrack } from '@/lib/metaPixel';

/** Envía ViewContent a Meta una sola vez, cuando esta marca entra en pantalla (p. ej. al llegar al catálogo de packs). */
export default function TrackView({ name }: { name: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        metaTrack('ViewContent', { content_name: name, content_type: 'product_group' });
        io.disconnect();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [name]);
  return <span ref={ref} aria-hidden="true" />;
}
