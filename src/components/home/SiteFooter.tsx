import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import CookieSettingsLink from '@/components/legal/CookieSettingsLink';
import { LEGAL_LINKS } from '@/components/legal/LegalPage';

/**
 * Pie de página de la web y la tienda: cierre de escena con el nombre gigante, navegación secundaria,
 * acceso de clientes y todos los enlaces legales. Va siempre en tinta, a sangre.
 */
export default function SiteFooter({ businessName, className = '' }: { businessName: string; className?: string }) {
  const link = 'hover:text-[var(--lime)] transition-colors';
  const body = businessName.slice(0, -1) || businessName;
  const last = businessName.slice(-1);

  return (
    <footer className={`home-slab ink ink-glow relative z-[2] overflow-hidden ${className}`}>
      <div className="max-w-[1320px] mx-auto px-5 md:px-10 pt-20 md:pt-28 pb-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 pb-14 border-b border-[var(--ink-line)]">
          <p className="display-lg max-w-3xl">
            ¿Hacemos <em>el tuyo?</em>
          </p>
          <Link href="/#contacto" className="btn-signal w-fit shrink-0">
            Hablemos
            <span className="btn-dot"><ArrowUpRight className="w-4 h-4" aria-hidden="true" /></span>
          </Link>
        </div>

        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr] py-12 text-sm text-white/60">
          <div>
            <p className="kicker mb-3">Corte final</p>
            <p className="max-w-xs">Vídeos con IA para negocios y marcas. Guion aprobado por ti, entrega lista para publicar.</p>
          </div>

          <nav aria-label="Web">
            <h2 className="mb-4 kicker !text-white/40">Web</h2>
            <ul className="space-y-2.5">
              <li><Link href="/#ejemplos" className={link}>Ejemplos</Link></li>
              <li>
                <Link href="/auth" className={`${link} inline-flex items-center gap-1`}>
                  Acceso clientes <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Legal">
            <h2 className="mb-4 kicker !text-white/40">Legal</h2>
            <ul className="space-y-2.5">
              {LEGAL_LINKS.map((l) => (
                <li key={l.href}><Link href={l.href} className={link}>{l.label}</Link></li>
              ))}
              <li><CookieSettingsLink className={`${link} cursor-pointer text-left`} /></li>
            </ul>
          </nav>
        </div>

        <div aria-hidden="true" className="mega-word -mx-1 mt-2 mb-4">
          {body}<b>{last}.</b>
        </div>

        <p className="pt-6 border-t border-[var(--ink-line)] text-xs text-white/40">
          © {new Date().getFullYear()} {businessName}. Todos los derechos reservados. Precios con IVA incluido.
        </p>
      </div>
    </footer>
  );
}
