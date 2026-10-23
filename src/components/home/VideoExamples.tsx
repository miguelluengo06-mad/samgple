'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import { EXAMPLE_VIDEOS } from '@/lib/exampleVideos';

/*
 * EJEMPLOS DE VÍDEO — lo que más vende, por eso va justo debajo del Hero.
 * Los vídeos y sus etiquetas están en src/lib/exampleVideos.ts, compartidos con la landing.
 *
 * Cada vídeo se reproduce solo mientras al menos la mitad está a la vista y se pausa al salir;
 * el único control es un botón para activar/silenciar el sonido.
 * Se presentan como fotogramas de película (perforaciones, toma y timecode) y se escalonan en vertical.
 */

function ExampleCard({ label, src, poster, index }: { label: string; src: string; poster: string; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const card = cardRef.current;
    const video = videoRef.current;
    if (!card || !video || !src) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.5 }
    );
    observer.observe(card);
    return () => observer.disconnect();
  }, [src]);

  const toggleSound = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
    if (!video.muted) video.play().catch(() => {});
  };

  return (
    <motion.figure
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.9, delay: index * 0.09, ease: [0.16, 1, 0.3, 1] }}
      className={`frame-card ${index % 2 === 1 ? 'lg:mt-16' : ''}`}
    >
      <div ref={cardRef} className="frame-card__screen viewfinder aspect-[9/16] bg-[var(--ink-hi)]" data-cursor="view" data-cursor-label="VER">
        {src ? (
          <>
            <video
              ref={videoRef}
              src={src}
              poster={poster || undefined}
              muted
              loop
              playsInline
              preload="metadata"
              aria-label={`Vídeo de ejemplo: ${label}`}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={toggleSound}
              aria-pressed={!muted}
              aria-label={muted ? 'Activar sonido' : 'Silenciar vídeo'}
              data-cursor="link"
              className="absolute z-10 right-3.5 bottom-3.5 grid place-items-center w-10 h-10 rounded-full bg-[var(--lime)] text-[#0c1208] transition-transform hover:scale-110"
            >
              {muted ? <VolumeX className="w-[18px] h-[18px]" aria-hidden="true" /> : <Volume2 className="w-[18px] h-[18px]" aria-hidden="true" />}
            </button>
          </>
        ) : (
          <div role="img" aria-label={`Espacio para vídeo: ${label}`} className="absolute inset-0 grid place-items-center text-sm text-white/40">
            Vídeo próximamente
          </div>
        )}
        <span className="vf-b" />
      </div>
      <figcaption className="frame-card__meta">
        <span className="whitespace-nowrap">Toma {String(index + 1).padStart(2, '0')}</span>
        <span className="text-right text-[var(--lime)]">{label}</span>
      </figcaption>
    </motion.figure>
  );
}

export default function VideoExamples() {
  return (
    <section id="ejemplos" className="px-5 md:px-10 pt-20 md:pt-32 pb-24 md:pb-36" aria-labelledby="ejemplos-title">
      <div className="max-w-[1320px] mx-auto">
        <div className="grid lg:grid-cols-[1fr_auto] gap-6 items-end mb-12 md:mb-20">
          <div>
            <span className="kicker">/ 01 · Muestra de rodaje</span>
            <h2 id="ejemplos-title" className="display-lg mt-5 max-w-4xl">
              Mira lo que hacemos. <em>¿Adivinas cuál es IA?</em>
            </h2>
          </div>
          <p className="max-w-xs text-sm text-white/60 leading-relaxed lg:pb-3">
            Cuatro piezas reales, en vertical y con sonido. Pulsa el altavoz de cualquiera para oírla.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-6 md:gap-x-7 md:gap-y-10">
          {EXAMPLE_VIDEOS.map((ex, i) => (
            <ExampleCard key={ex.label} {...ex} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
