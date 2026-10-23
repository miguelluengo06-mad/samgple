'use client';

import { useRef } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';

const STEPS = [
  {
    n: '01',
    title: 'Brief',
    description: 'Nos cuentas qué vendes, a quién y cómo hablas. Con eso entendemos tu negocio antes de escribir una línea.',
  },
  {
    n: '02',
    title: 'Guion para tu visto bueno',
    description: 'Escribimos los guiones y te los enviamos. Pides los cambios que quieras y no producimos nada hasta que los apruebes.',
  },
  {
    n: '03',
    title: 'Producción',
    description: 'Con el guion aprobado creamos los vídeos con IA: voz, subtítulos y el formato de cada red.',
  },
  {
    n: '04',
    title: 'Ajustes y entrega',
    description: 'Revisas el resultado, te lo ajustamos y lo recibes listo para publicar.',
  },
];

export default function Process() {
  const ref = useRef<HTMLDivElement>(null);
  // El raíl se rellena según avanzas por la sección: un pequeño "montaje" de las cuatro tomas
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 80%', 'end 60%'] });
  const fill = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.4 });

  return (
    <section id="metodo" className="ink ink-glow px-5 md:px-10 py-24 md:py-36 border-t border-[var(--ink-line)]">
      <div className="max-w-[1320px] mx-auto">
        <div className="mb-16 md:mb-24">
          <span className="kicker">/ 04 · Montaje</span>
          <h2 className="display-lg mt-5">
            Cómo <em>trabajamos</em>
          </h2>
        </div>

        <div ref={ref} className="reel">
          <div className="reel__rail hidden md:block" aria-hidden="true">
            <motion.div className="reel__fill" style={{ scaleX: fill }} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.n}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.8, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className={`relative ${i % 2 === 1 ? 'md:mt-14' : ''}`}
              >
                <span className="take-chip relative md:bg-[var(--ink)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--lime)]" /> Toma {step.n}
                </span>
                <div
                  className="font-kinetic font-black leading-none mt-8 mb-5 text-[5.5rem] md:text-[7rem] text-transparent select-none"
                  style={{ WebkitTextStroke: '1.5px rgba(211,255,60,0.55)' }}
                  aria-hidden="true"
                >
                  {step.n}
                </div>
                <h3 className="font-kinetic font-bold uppercase text-lg tracking-tight mb-3">{step.title}</h3>
                <p className="text-sm text-white/60 leading-relaxed max-w-xs">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
