'use client';

import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

const SERVICES = [
  {
    n: '01',
    title: 'Anuncios UGC con IA',
    description: 'Anuncios que parecen de un cliente real, en vertical 9:16 para TikTok, Reels, Shorts y Ads. Sin grabar y sin pagar a creadores.',
  },
  {
    n: '02',
    title: 'Influencer IA',
    description: 'Un personaje propio, siempre con su misma cara, su voz y su estilo, para publicar con constancia.',
  },
  {
    n: '03',
    title: 'Clonación y gemelo digital',
    description: 'Tu cara y tu voz, clonadas solo con tu autorización por escrito, para publicar sin ponerte delante de la cámara.',
  },
  {
    n: '04',
    title: 'Guiones a medida',
    description: 'Los escribimos tras un brief contigo, con varios ganchos, y los apruebas antes de producir nada.',
  },
  {
    n: '05',
    title: 'Voz, subtítulos y formato',
    description: 'Voz IA natural, subtítulos dinámicos y entrega lista para cada red, con música libre de derechos.',
  },
];

export default function Services() {
  return (
    <section id="servicios" className="ink ink-glow px-5 md:px-10 py-24 md:py-36 overflow-hidden">
      <div className="max-w-[1320px] mx-auto">
        <div className="grid lg:grid-cols-[1fr_auto] gap-6 items-end mb-14 md:mb-20">
          <div>
            <span className="kicker">/ 02 · Lo que ponemos en pantalla</span>
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="display-lg mt-5"
            >
              Qué <em>hacemos</em>
            </motion.h2>
          </div>
          <p className="max-w-xs text-sm text-white/60 leading-relaxed lg:pb-3">
            Vídeo con IA de principio a fin: guion, voz, edición y entrega en un solo sitio.
          </p>
        </div>

        <ul>
          {SERVICES.map((s, i) => (
            <motion.li
              key={s.n}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.7, delay: (i % 3) * 0.06, ease: [0.16, 1, 0.3, 1] }}
              className="service-row group"
              data-cursor="link"
            >
              <span className="font-mono-studio text-xs tracking-[0.16em] text-[var(--lime)] pt-2 md:pt-0">{s.n}</span>
              <h3 className="service-row__title">{s.title}</h3>
              <p className="service-row__desc">{s.description}</p>
              <ArrowUpRight
                aria-hidden="true"
                className="hidden md:block w-7 h-7 justify-self-end text-white/30 transition-[color,transform] duration-500 group-hover:text-[var(--lime)] group-hover:rotate-45"
              />
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
