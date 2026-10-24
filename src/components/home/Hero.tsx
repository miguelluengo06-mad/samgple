'use client';

import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import Marquee from './Marquee';
import Timecode from './Timecode';
import { EXAMPLE_VIDEOS } from '@/lib/exampleVideos';

const TICKER_WORDS = ['Vídeo con IA', 'UGC', 'Influencers IA', 'Anuncios', 'Guiones', 'Listo para publicar'];
const EASE = [0.16, 1, 0.3, 1] as const;

/** Cada línea del titular sube desde una ranura (máscara) con un pequeño retardo entre líneas. */
function Line({ children, delay, calm }: { children: React.ReactNode; delay: number; calm: boolean | null }) {
  return (
    <span className="mask-line">
      <motion.span
        initial={calm ? false : { y: '110%', rotate: 2 }}
        animate={{ y: 0, rotate: 0 }}
        transition={{ duration: 1, delay, ease: EASE }}
      >
        {children}
      </motion.span>
    </span>
  );
}

function Phone({ index, className, rotate, y }: { index: number; className: string; rotate: number; y: ReturnType<typeof useTransform<number, number>> }) {
  const ex = EXAMPLE_VIDEOS[index];
  return (
    <motion.div
      style={{ y, rotate }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1, delay: 0.5 + index * 0.15, ease: EASE }}
      className={`absolute viewfinder overflow-hidden rounded-[22px] border border-[rgba(236,242,224,0.18)] bg-[var(--ink-hi)] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)] ${className}`}
    >
      {ex?.src && (
        <video
          src={ex.src}
          poster={ex.poster || undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-label={`Vídeo de ejemplo: ${ex.label}`}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      <span className="absolute z-[4] top-3 left-4 flex items-center gap-1.5 font-mono-studio text-[10px] tracking-[0.14em] text-white">
        <span className="rec-dot" style={{ width: 7, height: 7 }} /> REC
      </span>
      <span className="absolute z-[4] bottom-3 left-4 font-mono-studio text-[10px] tracking-[0.14em] uppercase text-white/80">
        {ex?.label}
      </span>
      <span className="vf-b" />
    </motion.div>
  );
}

export default function Hero({ businessName }: { businessName: string }) {
  const ref = useRef<HTMLElement>(null);
  const calm = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const yA = useTransform(scrollYProgress, [0, 1], [0, calm ? 0 : -120]);
  const yB = useTransform(scrollYProgress, [0, 1], [0, calm ? 0 : -40]);
  const yC = useTransform(scrollYProgress, [0, 1], [0, calm ? 0 : -200]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, calm ? 0 : 80]);

  return (
    <section ref={ref} className="ink ink-glow relative overflow-hidden pt-28 md:pt-32 min-h-[100svh] flex flex-col">
      <div className="relative flex-1 max-w-[1320px] w-full mx-auto px-5 md:px-10 grid lg:grid-cols-[1.2fr_0.8fr] gap-10 items-center pb-16">
        <motion.div style={{ y: textY }} className="relative z-[3]">
          <motion.div
            initial={calm ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="inline-flex items-center gap-3 px-3 py-1.5 rounded-md border border-[var(--ink-line)] bg-[var(--ink-hi)]/80 mb-8"
          >
            <span className="flex items-center gap-2 font-mono-studio text-[11px] tracking-[0.16em] text-white">
              <span className="rec-dot" /> REC
            </span>
            <span className="w-px h-3.5 bg-[var(--ink-line)]" />
            <Timecode className="text-[11px] tracking-[0.12em] text-white/60" />
            <span className="w-px h-3.5 bg-[var(--ink-line)] hidden sm:block" />
            <span className="hidden sm:inline font-mono-studio text-[11px] tracking-[0.16em] uppercase text-white/50">9:16 · 24 fps</span>
          </motion.div>

          <h1 className="display-hero">
            <Line delay={0.1} calm={calm}>Hacemos</Line>
            <Line delay={0.2} calm={calm}>contenido</Line>
            <Line delay={0.3} calm={calm}>
              que <em>se mueve.</em>
            </Line>
          </h1>

          <motion.div
            initial={calm ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7, ease: EASE }}
            className="mt-10 flex flex-col sm:flex-row sm:items-center gap-7 sm:gap-10"
          >
            <p className="max-w-md text-[17px] md:text-lg leading-relaxed text-white/60">
              <span className="font-kinetic text-white">{businessName}</span> crea vídeos, influencers y anuncios con IA para negocios y
              ecommerce. Los guiones los apruebas tú antes de producir.
            </p>
            <a href="#prueba" className="btn-signal shrink-0 w-fit">
              Pide tu prueba gratis
              <span className="btn-dot"><ArrowUpRight className="w-4 h-4" aria-hidden="true" /></span>
            </a>
          </motion.div>
        </motion.div>

        {/* Tres planos de rodaje que flotan a distinta velocidad al hacer scroll */}
        <div className="relative h-[470px] sm:h-[560px] lg:h-[640px] mb-6 lg:mb-0">
          <Phone index={0} y={yA} rotate={-6} className="left-[0%] top-[12%] w-[38%] sm:w-[40%] aspect-[9/16]" />
          <Phone index={1} y={yB} rotate={3} className="left-[31%] top-0 w-[38%] sm:w-[40%] aspect-[9/16] z-[2]" />
          <Phone index={2} y={yC} rotate={9} className="right-[0%] top-[22%] w-[36%] sm:w-[38%] aspect-[9/16]" />
        </div>
      </div>

      {/* Cinta de rótulos, ligeramente inclinada */}
      <div className="relative -mx-4 rotate-[-1.4deg] bg-[var(--lime)] text-[#0c1208] py-3.5 md:py-4 mb-6" role="presentation">
        <Marquee
          items={TICKER_WORDS.map((word) => (
            <span key={word} className="flex items-center gap-6 px-6">
              <span className="font-kinetic font-black text-xl md:text-3xl uppercase tracking-tight">{word}</span>
              <span className="w-2 h-2 rounded-full bg-[#0c1208]" />
            </span>
          ))}
        />
      </div>
    </section>
  );
}
