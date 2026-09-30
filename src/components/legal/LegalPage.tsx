import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { LEGAL, isPending } from '@/lib/legal';
import CookieSettingsLink from './CookieSettingsLink';

/** Un dato legal del titular; si falta, sale resaltado para que no pase desapercibido. */
export function Legal({ v }: { v: string }) {
  return isPending(v) ? <mark className="bg-yellow-300 text-black px-1 rounded">{v}</mark> : <>{v}</>;
}

export const LEGAL_LINKS = [
  { href: '/aviso-legal', label: 'Aviso legal' },
  { href: '/privacidad', label: 'Privacidad' },
  { href: '/cookies', label: 'Cookies' },
  { href: '/terminos', label: 'Términos y condiciones' },
];

export function H2({ children }: { children: ReactNode }) {
  return <h2 className="text-xl font-semibold mt-10 mb-3 text-white">{children}</h2>;
}

export default function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-white/80">
      <header className="border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> {LEGAL.brand}
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 md:px-6 py-10 md:py-14 leading-relaxed text-[15px] [&_p]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-3 [&_li]:my-1 [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-white [&_table]:w-full [&_table]:text-sm [&_th]:text-left [&_th]:py-2 [&_th]:pr-3 [&_td]:py-2 [&_td]:pr-3 [&_td]:align-top [&_tr]:border-b [&_tr]:border-white/10">
        <h1 className="text-3xl md:text-4xl font-semibold text-white">{title}</h1>
        <p className="text-sm text-white/40 mt-2">Última actualización: {LEGAL.updated}</p>
        {children}
      </main>
      <footer className="border-t border-white/10">
        <nav aria-label="Legal" className="max-w-3xl mx-auto px-4 md:px-6 py-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/40">
          {LEGAL_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-white transition-colors">{l.label}</Link>
          ))}
          <CookieSettingsLink />
        </nav>
      </footer>
    </div>
  );
}
