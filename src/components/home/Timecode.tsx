'use client';

import { useEffect, useRef } from 'react';

const pad = (n: number, l = 2) => String(n).padStart(l, '0');

/** Contador HH:MM:SS:FF a 24 fps. Escribe directo en el DOM para no re-renderizar 24 veces por segundo. */
export default function Timecode({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const start = performance.now();
    const id = setInterval(() => {
      const t = (performance.now() - start) / 1000;
      const f = Math.floor((t % 1) * 24);
      const s = Math.floor(t) % 60;
      const m = Math.floor(t / 60) % 60;
      const h = Math.floor(t / 3600);
      if (ref.current) ref.current.textContent = `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
    }, 1000 / 24);
    return () => clearInterval(id);
  }, []);

  return <span ref={ref} className={`font-mono-studio ${className}`}>00:00:00:00</span>;
}
