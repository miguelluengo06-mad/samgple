'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import { EXAMPLE_VIDEOS } from '@/lib/exampleVideos';

/*
 * EJEMPLOS DE VÍDEO — lo que más vende, por eso va justo debajo del Hero (2.ª sección, igual que en la landing).
 * Los vídeos y sus etiquetas están en src/lib/exampleVideos.ts, compartidos con la landing.
 *
 * Cada vídeo se reproduce solo mientras al menos la mitad está a la vista y se pausa al salir;
 * el único control es un botón para activar/silenciar el sonido.
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
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: index * 0.07 }}
      className="relative"
    >
      <span className="absolute z-10 top-3 left-3 md:top-4 md:left-4 max-w-[calc(100%-1.5rem)] px-3 py-1.5 rounded-full border border-white/15 bg-black/80 text-xs md:text-[13px] font-bold leading-tight pointer-events-none">
        {label}
      </span>
      <div
        ref={cardRef}
        className="relative w-full aspect-[9/16] rounded-3xl overflow-hidden border border-white/15 bg-white/[0.05]"
      >
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
              className="absolute z-10 right-3.5 bottom-3.5 grid place-items-center w-10 h-10 rounded-full border border-white/20 bg-black/60 backdrop-blur text-white cursor-pointer transition-transform hover:scale-105"
            >
              {muted ? <VolumeX className="w-5 h-5" aria-hidden="true" /> : <Volume2 className="w-5 h-5" aria-hidden="true" />}
            </button>
          </>
        ) : (
          <div role="img" aria-label={`Espacio para vídeo: ${label}`} className="absolute inset-0 grid place-items-center text-sm text-white/40">
            Vídeo próximamente
          </div>
        )}
      </div>
    </motion.figure>
  );
}

export default function VideoExamples() {
  return (
    <section id="ejemplos" className="px-4 md:px-8 py-16 md:py-24" aria-labelledby="ejemplos-title">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 md:mb-12 max-w-3xl">
          <h2 id="ejemplos-title" className="font-kinetic font-black uppercase text-4xl md:text-6xl leading-none">
            Mira lo que hacemos. <span className="text-[var(--signal)]">¿Adivinas cuál es IA?</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-4 md:gap-x-5 md:gap-y-6">
          {EXAMPLE_VIDEOS.map((ex, i) => (
            <ExampleCard key={ex.label} {...ex} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
