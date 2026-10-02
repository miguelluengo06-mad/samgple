'use client';

import { motion } from 'framer-motion';
import { Video, PenTool, Sparkles, UserRound, Captions, Clapperboard } from 'lucide-react';
import { SINGLE_VIDEO } from '@/lib/packs';

const SERVICES = [
  {
    icon: Video,
    n: '01',
    title: 'Anuncios UGC con IA',
    description: 'Anuncios que parecen de un cliente real, en vertical 9:16 para TikTok, Reels, Shorts y Ads. Sin grabar y sin pagar a creadores.',
    size: 'lg',
  },
  {
    icon: Sparkles,
    n: '02',
    title: 'Influencer IA',
    description: 'Un personaje propio, siempre con su misma cara, su voz y su estilo, para publicar con constancia.',
    size: 'sm',
  },
  {
    icon: UserRound,
    n: '03',
    title: 'Clonación y gemelo digital',
    description: 'Tu cara y tu voz, clonadas solo con tu autorización por escrito, para publicar sin ponerte delante de la cámara.',
    size: 'sm',
  },
  {
    icon: PenTool,
    n: '04',
    title: 'Guiones a medida',
    description: 'Los escribimos tras un brief contigo, con varios ganchos, y los apruebas antes de producir nada.',
    size: 'sm',
  },
  {
    icon: Captions,
    n: '05',
    title: 'Voz, subtítulos y formato',
    description: 'Voz IA natural, subtítulos dinámicos y entrega lista para cada red, con música libre de derechos.',
    size: 'sm',
  },
  {
    icon: Clapperboard,
    n: '06',
    title: 'Vídeo suelto',
    description: `¿Solo necesitas una pieza? Un vídeo por ${SINGLE_VIDEO.price} €, con una revisión y entrega en 5 días.`,
    size: 'full',
  },
];

const sizeClasses: Record<string, string> = {
  lg: 'md:col-span-8',
  sm: 'md:col-span-4',
  full: 'md:col-span-12',
};

export default function Services() {
  return (
    <section id="servicios" className="px-4 md:px-6 py-24 md:py-32 border-t border-white/10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between gap-6 mb-14 flex-wrap">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
            className="font-kinetic font-black uppercase text-4xl md:text-6xl leading-none"
          >
            Qué
            <br />
            hacemos
          </motion.h2>
          <p className="text-white/40 max-w-xs text-sm">
            Vídeo con IA de principio a fin: guion, voz, edición y entrega en un solo sitio.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-5">
          {SERVICES.map((service, i) =>
            service.size === 'full' ? (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5 }}
                className={`group relative border border-white/10 hover:border-[var(--signal)]/50 rounded-2xl p-7 md:p-9 transition-colors flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 ${sizeClasses[service.size]}`}
              >
                <div className="flex items-center gap-4 shrink-0">
                  <span className="font-kinetic text-xs text-white/30">{service.n}</span>
                  <service.icon className="w-6 h-6 text-[var(--signal)]" />
                  <h3 className="font-kinetic text-xl md:text-2xl uppercase">{service.title}</h3>
                </div>
                <p className="text-sm text-white/50 leading-relaxed">{service.description}</p>
              </motion.div>
            ) : (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
                className={`group relative border border-white/10 hover:border-[var(--signal)]/50 rounded-2xl p-7 md:p-9 transition-colors ${sizeClasses[service.size]}`}
              >
                <div className="flex items-start justify-between mb-10">
                  <span className="font-kinetic text-xs text-white/30">{service.n}</span>
                  <service.icon className="w-5 h-5 text-white/30 group-hover:text-[var(--signal)] transition-colors" />
                </div>
                <h3 className="font-kinetic text-xl md:text-2xl uppercase mb-3">{service.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed max-w-sm">{service.description}</p>
              </motion.div>
            )
          )}
        </div>
      </div>
    </section>
  );
}
