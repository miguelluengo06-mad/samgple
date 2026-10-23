'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { motion, useScroll, useSpring } from 'framer-motion';
import { isStudioPath } from './studio';

/**
 * Detalles de experiencia de la web pública: cursor propio que cambia según lo que hay debajo
 * (enlace / vídeo) y una barra superior que avanza con la lectura, como una tira de película.
 * Con puntero táctil o "reducir movimiento" no hace nada.
 */
export default function StudioChrome() {
  const pathname = usePathname();
  const active = isStudioPath(pathname);
  const cursorRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const { scrollYProgress } = useScroll();
  const reel = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });

  useEffect(() => {
    if (!active) return;
    const fine = window.matchMedia('(pointer: fine)').matches;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const el = cursorRef.current;
    if (!fine || calm || !el) return;

    document.documentElement.classList.add('has-studio-cursor');
    let x = -100;
    let y = -100;
    let cx = x;
    let cy = y;
    let raf = 0;

    const move = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      el.style.opacity = '1';
      const target = (e.target as Element | null)?.closest?.('[data-cursor], a, button, summary, label, input, select, textarea');
      const kind = target?.getAttribute('data-cursor') ?? (target ? 'link' : '');
      el.dataset.state = kind;
      if (labelRef.current) labelRef.current.textContent = target?.getAttribute('data-cursor-label') ?? '';
    };
    const leave = () => { el.style.opacity = '0'; };
    const tick = () => {
      cx += (x - cx) * 0.22;
      cy += (y - cy) * 0.22;
      el.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerleave', leave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', move);
      document.removeEventListener('pointerleave', leave);
      document.documentElement.classList.remove('has-studio-cursor');
    };
  }, [active]);

  if (!active) return null;
  return (
    <>
      <motion.div className="scroll-reel" style={{ scaleX: reel }} aria-hidden="true" />
      <div ref={cursorRef} className="studio-cursor" style={{ opacity: 0 }} aria-hidden="true">
        <span ref={labelRef} />
      </div>
    </>
  );
}
