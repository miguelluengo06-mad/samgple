'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import KineticWordmark from './KineticWordmark';

type Item = { href: string; label: string };

const HOME_ITEMS: Item[] = [
  { href: '/#ejemplos', label: 'Ejemplos' },
  { href: '/#servicios', label: 'Servicios' },
  { href: '/#prueba', label: 'Prueba gratis' },
  { href: '/#metodo', label: 'Método' },
];

/**
 * Cabecera flotante en píldora oscura: se esconde al bajar y vuelve al subir, así no tapa el contenido.
 */
export default function SiteNav({
  businessName,
  items = HOME_ITEMS,
}: {
  businessName: string;
  items?: Item[];
}) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - last) < 8) return;
      setHidden(y > last && y > 240);
      last = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className="site-nav" data-hidden={hidden}>
      <Link href="/" aria-label="Inicio">
        <KineticWordmark name={businessName} className="text-lg" />
      </Link>
      <nav aria-label="Principal" className="flex items-center gap-0.5 md:gap-1">
        {items.map((it) => (
          <Link key={it.href} href={it.href} className="nav-link hidden md:inline-block">
            {it.label}
          </Link>
        ))}
        <Link href="/auth" className="nav-link hidden sm:inline-block">Acceder</Link>
        <Link href="/#contacto" className="ml-1 inline-flex items-center gap-2 pl-4 pr-1.5 h-10 rounded-full bg-[var(--lime)] text-[#0c1208] text-[13px] font-semibold whitespace-nowrap hover:brightness-95 transition">
          Hablemos
          <span className="grid place-items-center w-7 h-7 rounded-full bg-[#0c1208] text-[var(--lime)]">
            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
          </span>
        </Link>
      </nav>
    </header>
  );
}
