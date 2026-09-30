import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import KineticWordmark from '@/components/home/KineticWordmark';
import CookieSettingsLink from '@/components/legal/CookieSettingsLink';
import { LEGAL_LINKS } from '@/components/legal/LegalPage';

/** Pie de página de la web y la tienda: navegación secundaria, acceso de clientes y todos los enlaces legales. */
export default function SiteFooter({ businessName, className = '' }: { businessName: string; className?: string }) {
  const link = 'hover:text-white transition-colors';
  return (
    <footer className={`home-slab relative z-[2] ${className}`}>
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-10 md:py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Link href="/" aria-label="Inicio">
              <KineticWordmark name={businessName} className="text-xl" />
            </Link>
            <p className="mt-3 text-sm text-white/50 max-w-xs">Vídeos con IA para negocios y marcas.</p>
          </div>

          <nav aria-label="Web" className="text-sm text-white/50">
            <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-white/30">Web</h2>
            <ul className="space-y-2">
              <li><Link href="/#precios" className={link}>Precios</Link></li>
              <li><Link href="/store" className={link}>Tienda</Link></li>
              <li>
                <Link href="/auth" className={`${link} inline-flex items-center gap-1`}>
                  Acceso clientes <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Legal" className="text-sm text-white/50">
            <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-white/30">Legal</h2>
            <ul className="space-y-2">
              {LEGAL_LINKS.map((l) => (
                <li key={l.href}><Link href={l.href} className={link}>{l.label}</Link></li>
              ))}
              <li><CookieSettingsLink className={`${link} cursor-pointer text-left`} /></li>
            </ul>
          </nav>
        </div>

        <p className="mt-10 pt-6 border-t border-white/10 text-xs text-white/30">
          © {new Date().getFullYear()} {businessName}. Todos los derechos reservados. Precios con IVA incluido.
        </p>
      </div>
    </footer>
  );
}
