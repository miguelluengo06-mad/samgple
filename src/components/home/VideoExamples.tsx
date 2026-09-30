'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';

/*
 * EJEMPLOS DE VÍDEO — lo que más vende, por eso va justo debajo del Hero.
 *
 * Para poner un vídeo: rellena `src` con su URL (MP4 vertical 9:16, ligero) y, si quieres portada, `poster`.
 * Mientras `src` esté vacío se ve el hueco con el botón de play. Al tocar un hueco con vídeo, se reproduce.
 * Si el vídeo está en otro dominio, permítelo en `media-src` de la CSP (next.config.ts).
 */
const EXAMPLES: { label: string; src: string; poster: string }[] = [
  { label: 'Anuncio UGC', src: '', poster: '' },
  { label: 'Influencer IA', src: '', poster: '' },
  { label: 'Vídeo de producto', src: '', poster: '' },
  { label: 'Réplica digital', src: '', poster: '' },
];

export default function VideoExamples() {
  const [playing, setPlaying] = useState<Set<number>>(new Set());

  return (
    <section id="ejemplos" className="px-4 md:px-8 py-16 md:py-24" aria-labelledby="ejemplos-title">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 md:mb-12 max-w-2xl">
          <span className="text-xs tracking-[0.25em] uppercase text-[var(--signal)]">Ejemplos</span>
          <h2 id="ejemplos-title" className="font-kinetic font-black uppercase text-4xl md:text-6xl leading-none mt-4">
            Míralo tú mismo
          </h2>
          <p className="text-white/60 mt-4 text-base md:text-lg">
            Vídeos hechos con IA para negocios como el tuyo. ¿Notas que no se grabaron?
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
          {EXAMPLES.map((ex, i) => (
            <motion.figure
              key={ex.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: i * 0.07 }}
              className="relative"
            >
              <span className="absolute z-10 top-3 left-3 max-w-[calc(100%-1.5rem)] px-3 py-1.5 rounded-full border border-white/15 bg-black/70 backdrop-blur text-xs font-semibold leading-tight pointer-events-none">
                {ex.label}
              </span>
              {playing.has(i) && ex.src ? (
                <video
                  src={ex.src}
                  poster={ex.poster || undefined}
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                  aria-label={`Vídeo de ejemplo: ${ex.label}`}
                  className="w-full aspect-[9/16] rounded-3xl object-cover border border-white/10 bg-black"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => ex.src && setPlaying((prev) => new Set(prev).add(i))}
                  aria-label={`Reproducir vídeo de ejemplo: ${ex.label}`}
                  className="group relative block w-full aspect-[9/16] rounded-3xl border border-white/15 bg-white/[0.05] overflow-hidden transition-transform duration-300 hover:-translate-y-1.5"
                  style={ex.poster ? { backgroundImage: `url(${ex.poster})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                >
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="w-16 h-16 rounded-full bg-[var(--signal)] text-black flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                      <Play className="w-6 h-6 ml-0.5 fill-current" aria-hidden="true" />
                    </span>
                  </span>
                </button>
              )}
              <figcaption className="mt-2 text-sm text-white/60">[Vídeo de ejemplo]</figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
