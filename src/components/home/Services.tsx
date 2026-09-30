'use client';

import { motion } from 'framer-motion';
import { Video, PenTool, Camera, TrendingUp, Megaphone, Sparkles } from 'lucide-react';

const SERVICES = [
  {
    icon: Video,
    n: '01',
    title: 'Vídeo',
    description: 'Contenido en corto y largo formato, grabado y editado para cómo se consume hoy: rápido, vertical, sin relleno.',
    size: 'lg',
  },
  {
    icon: TrendingUp,
    n: '02',
    title: 'Estrategia',
    description: 'Calendarios de contenido construidos sobre lo que mueve resultados, no vanity metrics.',
    size: 'sm',
  },
  {
    icon: PenTool,
    n: '03',
    title: 'Copy & voz de marca',
    description: 'Guiones, captions y textos web con una voz reconocible — la vuestra, no una plantilla.',
    size: 'sm',
  },
  {
    icon: Camera,
    n: '04',
    title: 'Fotografía',
    description: 'Producto, marca y lifestyle con dirección de arte consistente en cada pieza.',
    size: 'sm',
  },
  {
    icon: Megaphone,
    n: '05',
    title: 'Contenido para pago',
    description: 'Creatividades pensadas para parar el scroll en paid social, testadas contra rendimiento real.',
    size: 'sm',
  },
  {
    icon: Sparkles,
    n: '06',
    title: 'Gestión de redes',
    description: 'Publicación, comunidad y reporting — vuestros canales, llevados de principio a fin.',
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
            Seis disciplinas, un mismo equipo. Sin subcontratar cada pieza a una agencia distinta.
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
