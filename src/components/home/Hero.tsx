'use client';

import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import Marquee from './Marquee';
import { BookCallButton } from './BookCall';

const TICKER_WORDS = ['VÍDEO CON IA', 'UGC', 'INFLUENCERS IA', 'ANUNCIOS', 'GUIONES', 'LISTO PARA PUBLICAR'];

export default function Hero({ businessName }: { businessName: string }) {
  return (
    <section className="relative pt-28 pb-16 md:pt-40 md:pb-24 px-4 md:px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-2 text-xs tracking-[0.25em] uppercase text-[var(--signal)] mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--signal)]" />
          Vídeos con IA para negocios y marcas
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="font-kinetic font-black uppercase leading-[0.88] tracking-tight text-[10vw] sm:text-[9vw] md:text-[7.5vw] lg:text-[6.5vw]"
        >
          Hacemos
          <br />
          contenido que
          <br />
          <span className="home-glow-text text-[var(--signal)]">se mueve.</span>
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="mt-10 flex flex-col md:flex-row md:items-end justify-between gap-8"
        >
          <p className="text-lg md:text-xl text-white/60 max-w-md leading-relaxed">
            <span className="font-kinetic text-white">{businessName}</span> crea vídeos, influencers y
            anuncios con IA para negocios y ecommerce: con guiones que tú apruebas antes de producir.
          </p>

          <BookCallButton className="group inline-flex items-center gap-3 pl-6 pr-2 py-2 rounded-full border border-white/15 hover:border-[var(--signal)] transition-colors w-fit shrink-0">
            <span className="text-sm font-medium tracking-wide">Agenda una llamada</span>
            <span className="w-9 h-9 rounded-full bg-[var(--signal)] text-black flex items-center justify-center group-hover:rotate-45 transition-transform">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </BookCallButton>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="mt-20 md:mt-28 border-y border-white/10 py-5"
      >
        <Marquee
          items={TICKER_WORDS.map((word) => (
            <span key={word} className="flex items-center gap-6 px-6">
              <span className="font-kinetic text-2xl md:text-3xl uppercase text-white/25">{word}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--signal)]" />
            </span>
          ))}
        />
      </motion.div>
    </section>
  );
}
