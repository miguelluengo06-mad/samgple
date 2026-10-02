'use client';

import { motion } from 'framer-motion';

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
  return (
    <section id="metodo" className="px-4 md:px-6 py-24 md:py-32 border-t border-white/10">
      <div className="max-w-6xl mx-auto">
        <div className="mb-16">
          <span className="text-xs tracking-[0.25em] uppercase text-[var(--signal)]">Método</span>
          <h2 className="font-kinetic font-black uppercase text-4xl md:text-6xl leading-none mt-4">
            Cómo trabajamos
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-6">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.n}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.55, delay: i * 0.1 }}
              className="relative"
            >
              <div className="font-kinetic text-5xl md:text-6xl text-white/10 mb-6">{step.n}</div>
              <h3 className="text-lg font-medium mb-2 uppercase tracking-wide">{step.title}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{step.description}</p>
              {i < STEPS.length - 1 && (
                <div className="hidden md:block absolute top-6 left-[calc(100%-1rem)] w-8 h-px bg-white/10" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
