'use client';

import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { useBookCall } from './BookCall';

const CASES = [
  {
    client: 'Nordic Fitness Co.',
    sector: 'Retail / Fitness',
    headline: 'De 4K a 210K seguidores en 9 meses reestructurando su contenido de vídeo.',
    metricLabel: 'Alcance mensual',
    before: '85K',
    after: '2.4M',
    tag: 'Vídeo + Estrategia',
  },
  {
    client: 'Lumen Skincare',
    sector: 'Beauty / DTC',
    headline: 'Campaña de contenido pagado que bajó el coste por adquisición a la mitad.',
    metricLabel: 'Coste por adquisición',
    before: '38€',
    after: '17€',
    tag: 'Paid Content',
  },
  {
    client: 'Marea Studio',
    sector: 'Inmobiliaria',
    headline: 'Rediseño de voz de marca y calendario editorial para posicionarse como referencia local.',
    metricLabel: 'Leads cualificados / mes',
    before: '12',
    after: '96',
    tag: 'Copy + Redes',
  },
];

export default function CaseStudies() {
  const { open } = useBookCall();
  return (
    <section id="casos" className="px-4 md:px-6 py-24 md:py-32 border-t border-white/10">
      <div className="max-w-6xl mx-auto">
        <div className="mb-14">
          <span className="text-xs tracking-[0.25em] uppercase text-[var(--signal)]">Resultados</span>
          <h2 className="font-kinetic font-black uppercase text-4xl md:text-6xl leading-none mt-4">
            No prometemos.
            <br />
            Medimos.
          </h2>
        </div>

        <div className="flex flex-col divide-y divide-white/10 border-y border-white/10">
          {CASES.map((c, i) => (
            <motion.button
              key={c.client}
              type="button"
              onClick={() => open()}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className="group grid grid-cols-1 md:grid-cols-12 items-center gap-4 md:gap-8 py-8 md:py-10 text-left w-full"
            >
              <div className="md:col-span-1 font-kinetic text-xs text-white/30">0{i + 1}</div>

              <div className="md:col-span-5">
                <div className="text-xs uppercase tracking-widest text-white/40 mb-2">
                  {c.client} · {c.sector}
                </div>
                <h3 className="text-lg md:text-xl font-medium leading-snug group-hover:text-[var(--signal)] transition-colors">
                  {c.headline}
                </h3>
              </div>

              <div className="md:col-span-4 flex items-center gap-4">
                <div>
                  <div className="text-xs text-white/40 mb-1">{c.metricLabel}</div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-serif-display italic text-2xl text-white/40 line-through decoration-white/20">{c.before}</span>
                    <ArrowUpRight className="w-4 h-4 text-[var(--signal)]" />
                    <span className="font-serif-display italic text-3xl md:text-4xl text-[var(--signal)]">{c.after}</span>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 flex md:justify-end">
                <span className="text-xs px-3 py-1.5 rounded-full border border-white/15 text-white/50 group-hover:border-[var(--signal)] group-hover:text-[var(--signal)] transition-colors whitespace-nowrap">
                  {c.tag}
                </span>
              </div>
            </motion.button>
          ))}
        </div>

        <p className="text-xs text-white/30 mt-6">
          Cifras ilustrativas de casos representativos — pídenos referencias reales en la llamada.
        </p>
      </div>
    </section>
  );
}
