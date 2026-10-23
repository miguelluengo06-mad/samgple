import type { ReactNode } from 'react';
import SiteNav from '@/components/home/SiteNav';
import SiteFooter from '@/components/home/SiteFooter';
import { LEGAL, isPending } from '@/lib/legal';

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
  return (
    <h2 className="font-kinetic font-bold uppercase tracking-tight text-lg md:text-xl mt-14 mb-4 pt-6 border-t border-[#16210e]/15 text-[#16210e]">
      {children}
    </h2>
  );
}

export default function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="home-root min-h-screen">
      <SiteNav businessName={LEGAL.brand} items={LEGAL_LINKS.map((l) => ({ href: l.href, label: l.label.replace(' y condiciones', '') }))} />

      <main id="contenido">
        <section className="ink ink-glow px-5 md:px-10 pt-32 md:pt-40 pb-14 md:pb-20">
          <div className="max-w-3xl mx-auto">
            <span className="kicker">/ Legal</span>
            <h1 className="display-md mt-5">{title}</h1>
            <p className="font-mono-studio text-xs tracking-[0.14em] uppercase text-white/50 mt-6">Última actualización: {LEGAL.updated}</p>
          </div>
        </section>

        <section className="px-5 md:px-10 py-14 md:py-20">
          <article className="max-w-3xl mx-auto leading-relaxed text-[16px] text-[#16210e]/85 [&_p]:my-3.5 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-3.5 [&_li]:my-1.5 [&_a]:underline [&_a]:underline-offset-4 [&_a]:decoration-[var(--olive)] [&_a:hover]:text-[var(--olive)] [&_strong]:text-[#16210e] [&_table]:w-full [&_table]:text-sm [&_th]:text-left [&_th]:py-2.5 [&_th]:pr-3 [&_td]:py-2.5 [&_td]:pr-3 [&_td]:align-top [&_tr]:border-b [&_tr]:border-[#16210e]/15 [&_table]:block [&_table]:overflow-x-auto">
            {children}
          </article>
        </section>
      </main>

      <SiteFooter businessName={LEGAL.brand} />
    </div>
  );
}
