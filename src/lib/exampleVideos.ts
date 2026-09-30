/**
 * Vídeos de ejemplo de la sección «Mira lo que hacemos» — ÚNICA fuente: la usan la landing y la web.
 * MP4 vertical 9:16 y ligero. Los vídeos están en Cloudflare R2: ese dominio debe estar permitido en `media-src`
 * de la CSP (next.config.ts). `poster` es opcional.
 */
export const EXAMPLE_VIDEOS: { label: string; src: string; poster: string }[] = [
  { label: 'Restaurante', src: 'https://pub-e87160a916994231bb484c99e8e7ef01.r2.dev/video%20landing%202.mp4', poster: '' },
  { label: 'Clínica estética', src: 'https://pub-e87160a916994231bb484c99e8e7ef01.r2.dev/video%20landing%20clinica%20chica.mp4', poster: '' },
  { label: 'Influencer IA · Moda', src: 'https://pub-e87160a916994231bb484c99e8e7ef01.r2.dev/video%20modelo%20landing%20chica%20.mp4', poster: '' },
  { label: 'Anuncio · Ecommerce', src: 'https://pub-e87160a916994231bb484c99e8e7ef01.r2.dev/4%20video%20.mp4', poster: '' },
];
