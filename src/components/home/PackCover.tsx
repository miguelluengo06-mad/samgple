import type { CSSProperties } from 'react';
import { Megaphone, ScanFace, ShoppingBag, Sparkles, UserRound, Video, type LucideIcon } from 'lucide-react';

/**
 * Portada de una ficha de producto (pack): degradado por servicio, la cifra principal en grande
 * ("10 vídeos"), etiquetas de formato y unos móviles con un vídeo vertical 9:16. Los estilos están en
 * globals.css (.pack-cover*, .pack-phone*) para usarla igual en la web y en la landing.
 */
const LOOK: Record<string, { colors: [string, string]; icon: LucideIcon; tags: string[] }> = {
  ugc: { colors: ['#3a4d20', '#7a9440'], icon: Megaphone, tags: ['Meta', 'TikTok', '9:16'] },
  influencer: { colors: ['#1f4a3a', '#4f9070'], icon: Sparkles, tags: ['Instagram', 'TikTok', '9:16'] },
  ecommerce: { colors: ['#586711', '#a7bd2f'], icon: ShoppingBag, tags: ['9:16', '1:1', 'Tu ficha'] },
  avatar: { colors: ['#28422a', '#5e8a4a'], icon: UserRound, tags: ['Voz propia', 'Exclusivo'] },
  replica: { colors: ['#36422e', '#83946a'], icon: ScanFace, tags: ['Tu imagen', 'Tu voz'] },
  suelto: { colors: ['#6b6f2d', '#b8bd6a'], icon: Video, tags: ['1 revisión', '5 días'] },
  welcome: { colors: ['#a8330f', '#f0703f'], icon: Sparkles, tags: ['9:16', 'Subtítulos', '72 h'] },
};

function Phone({ variant }: { variant: 'front' | 'mid' | 'back' }) {
  return (
    <span className={`pack-phone pack-phone--${variant}`}>
      <span className="pack-phone__screen">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5.5v13a.6.6 0 0 0 .9.5l10.6-6.5a.6.6 0 0 0 0-1L8.9 5a.6.6 0 0 0-.9.5Z" />
        </svg>
        <span className="pack-phone__sub" />
        <span className="pack-phone__sub pack-phone__sub--short" />
      </span>
      <span className="pack-phone__bar" />
    </span>
  );
}

export default function PackCover({
  kind,
  chip,
  headline,
  badge,
  compact = false,
}: {
  /** ugc · influencer · ecommerce · avatar · replica · suelto · welcome */
  kind: string;
  /** Categoría, arriba a la izquierda */
  chip: string;
  /** Cifra principal, en grande abajo */
  headline: string;
  /** "El más elegido", "Recomendado"… */
  badge?: string;
  compact?: boolean;
}) {
  const look = LOOK[kind] ?? LOOK.ugc;
  const Icon = look.icon;
  const style = { '--c1': look.colors[0], '--c2': look.colors[1] } as CSSProperties;
  // "20 vídeos/mes" → big number + small unit; text-only headlines ("Tu personaje") stay as they are
  const match = headline.match(/^(\d+)\s+(.+)$/);

  return (
    <div className={`pack-cover${compact ? ' pack-cover--compact' : ''}`} style={style}>
      <Icon className="pack-cover__icon" strokeWidth={1.2} aria-hidden="true" />
      <span className="pack-cover__chip">{chip}</span>
      {badge && <span className="pack-cover__badge">{badge}</span>}

      <span className="pack-cover__phones" aria-hidden="true">
        <Phone variant="back" />
        <Phone variant="mid" />
        <Phone variant="front" />
      </span>

      <span className="pack-cover__text">
        {match ? (
          <span className="pack-cover__headline pack-cover__headline--num">
            <span className="pack-cover__num">{match[1]}</span>
            <span className="pack-cover__unit">{match[2]}</span>
          </span>
        ) : (
          <span className="pack-cover__headline">{headline}</span>
        )}
        {!compact && (
          <span className="pack-cover__tags">
            {look.tags.map((tag) => (
              <span key={tag} className="pack-cover__tag">
                {tag}
              </span>
            ))}
          </span>
        )}
      </span>
    </div>
  );
}
