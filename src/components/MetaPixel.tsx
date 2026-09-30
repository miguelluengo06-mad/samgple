'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { whenConsented } from '@/lib/cookieConsent';
import { META_PIXEL_ID, PIXEL_EXCLUDED_PREFIXES, loadMetaPixel, metaTrack } from '@/lib/metaPixel';

/** Carga el píxel de Meta solo con consentimiento de publicidad y registra PageView en cada cambio de página. */
export default function MetaPixel() {
  const pathname = usePathname() || '/';
  const excluded = PIXEL_EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (!META_PIXEL_ID || excluded) return;
    return whenConsented('marketing', () => {
      loadMetaPixel(META_PIXEL_ID); // no hace nada si ya estaba cargado
      metaTrack('PageView'); // uno por página vista (también al navegar sin recargar)
    });
  }, [pathname, excluded]);

  return null;
}
