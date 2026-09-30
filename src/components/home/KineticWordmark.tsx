'use client';

import { motion, useScroll, useTransform } from 'framer-motion';

export default function KineticWordmark({ name, className = '' }: { name: string; className?: string }) {
  const { scrollY } = useScroll();
  const tracking = useTransform(scrollY, [0, 400], ['0em', '0.08em']);
  const opacity = useTransform(scrollY, [0, 400], [1, 0.6]);

  // Treat the last character as the mark: samgpl(e) — the accented full stop
  const body = name.slice(0, -1) || name;
  const last = name.slice(-1);

  return (
    <motion.span
      style={{ letterSpacing: tracking, opacity }}
      className={`font-kinetic font-bold lowercase inline-flex items-baseline ${className}`}
    >
      {body}
      <span className="text-[var(--signal)]">{last}</span>
      <span className="text-[var(--signal)]">.</span>
    </motion.span>
  );
}
