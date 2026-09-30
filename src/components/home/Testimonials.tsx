'use client';

import { motion } from 'framer-motion';
import Marquee from './Marquee';

const CLIENT_NAMES = [
  'Nordic Fitness Co.', 'Lumen Skincare', 'Marea Studio', 'Bloque Café', 'Halcón Logística', 'Verde Interiores',
];

const QUOTES = [
  {
    quote: 'Pasamos de publicar sin rumbo a tener un sistema de contenido que de verdad trae clientes. El cambio se notó en dos meses.',
    author: 'Directora de Marketing, Nordic Fitness Co.',
  },
  {
    quote: 'Lo que más valoramos es que entienden de negocio, no solo de estética. Cada pieza tiene un porqué.',
    author: 'Fundadora, Lumen Skincare',
  },
];

export default function Testimonials() {
  return (
    <section className="py-24 md:py-32 border-t border-white/10">
      <div className="max-w-6xl mx-auto px-4 md:px-6 mb-14">
        <span className="text-xs tracking-[0.25em] uppercase text-[var(--signal)]">Confianza</span>
      </div>

      <Marquee
        className="mb-16"
        items={CLIENT_NAMES.map((name) => (
          <span key={name} className="home-logo-item px-10 font-kinetic text-2xl md:text-3xl uppercase whitespace-nowrap">
            {name}
          </span>
        ))}
      />

      <div className="max-w-6xl mx-auto px-4 md:px-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        {QUOTES.map((q, i) => (
          <motion.blockquote
            key={q.author}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="border-l-2 border-[var(--signal)] pl-6"
          >
            <p className="font-serif-display italic text-xl md:text-2xl leading-snug text-white/90">
              "{q.quote}"
            </p>
            <footer className="mt-4 text-xs uppercase tracking-widest text-white/40">{q.author}</footer>
          </motion.blockquote>
        ))}
      </div>
    </section>
  );
}
