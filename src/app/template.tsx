'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { isStudioPath } from '@/components/studio/studio';

// La primera carga entra limpia (sin cortinilla: no retrasa el contenido ni a los buscadores);
// las navegaciones siguientes cierran y abren una cortinilla de tinta con la marca.
let hasNavigated = false;

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const calm = useReducedMotion();
  const [curtain, setCurtain] = useState(() => hasNavigated && isStudioPath(pathname));

  useEffect(() => {
    hasNavigated = true;
    if (!curtain) return;
    const t = setTimeout(() => setCurtain(false), 650);
    return () => clearTimeout(t);
  }, [curtain]);

  return (
    <>
      {children}
      <AnimatePresence>
        {curtain && !calm && (
          <motion.div
            key="curtain"
            className="page-curtain"
            initial={{ clipPath: 'inset(0 0 0% 0)' }}
            animate={{ clipPath: 'inset(0 0 0% 0)' }}
            exit={{ clipPath: 'inset(0 0 100% 0)', transition: { duration: 0.7, ease: [0.76, 0, 0.24, 1] } }}
            aria-hidden="true"
          >
            <span className="font-kinetic font-black lowercase text-[#ecf2e0] text-4xl md:text-6xl tracking-tight">
              samgpl<span style={{ color: 'var(--lime)' }}>e.</span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
