import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Timecode from '@/components/home/Timecode';
import KineticWordmark from '@/components/home/KineticWordmark';

/**
 * Marco de las páginas de acceso (entrar, crear contraseña, invitaciones, errores):
 * a la izquierda un set oscuro con la marca y un REC vivo; a la derecha, el papel donde se escribe.
 * En móvil el set se reduce a una cabecera.
 */
export default function AuthShell({
  businessName = 'samgple',
  title,
  kicker = '/ Acceso',
  children,
}: {
  businessName?: string;
  /** Titular del set; el texto entre *asteriscos* sale en serif cursiva lima. */
  title: string;
  kicker?: string;
  children: React.ReactNode;
}) {
  const body = businessName.slice(0, -1) || businessName;
  const last = businessName.slice(-1);
  const parts = title.split('*');

  return (
    <div className="home-root min-h-screen grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <aside className="ink ink-glow relative overflow-hidden flex flex-col justify-between px-5 py-5 lg:p-12 lg:min-h-screen">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" aria-label="Ir a la web">
            <KineticWordmark name={businessName} className="text-xl lg:text-2xl" />
          </Link>
          <span className="flex items-center gap-2 font-mono-studio text-[11px] tracking-[0.16em] text-white/70">
            <span className="rec-dot" /> REC <Timecode className="text-white/50" />
          </span>
        </div>

        <div className="hidden lg:block max-w-xl">
          <span className="kicker">{kicker}</span>
          <h1 className="display-lg mt-5">
            {parts.map((p, i) => (i % 2 === 1 ? <em key={i}>{p}</em> : <span key={i}>{p}</span>))}
          </h1>
          <p className="mt-6 text-white/60 max-w-sm leading-relaxed">
            Tus vídeos, tus guiones y tus pedidos en un solo sitio. Las cuentas las crea la agencia: si no tienes acceso, escríbenos.
          </p>
        </div>

        <div aria-hidden="true" className="hidden lg:block mega-word -mx-1 -mb-2" style={{ fontSize: 'clamp(3rem, 7.4vw, 10rem)' }}>
          {body}<b>{last}.</b>
        </div>
      </aside>

      <section className="relative flex flex-col justify-center px-5 sm:px-10 py-10 lg:py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors self-start mb-8 lg:absolute lg:top-8 lg:left-10 lg:mb-0"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Volver a la web
        </Link>
        <div className="w-full max-w-md mx-auto auth-panel">{children}</div>
      </section>
    </div>
  );
}
