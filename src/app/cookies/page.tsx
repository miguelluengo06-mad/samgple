import type { Metadata } from 'next';
import LegalPage, { H2, Legal } from '@/components/legal/LegalPage';
import CookieSettingsLink from '@/components/legal/CookieSettingsLink';
import { LEGAL } from '@/lib/legal';

export const metadata: Metadata = { title: `Política de cookies — ${LEGAL.brand}`, robots: { index: true, follow: true } };

export default function CookiesPage() {
  return (
    <LegalPage title="Política de cookies">
      <p>
        Esta política explica qué son las cookies, cuáles usa <strong>{LEGAL.domain}</strong> y cómo puedes gestionarlas, conforme al artículo 22.2 de
        la LSSI-CE y al RGPD. El responsable es <Legal v={LEGAL.name} /> (ver <a href="/aviso-legal">Aviso legal</a>).
      </p>

      <H2>1. Qué son las cookies</H2>
      <p>
        Son pequeños archivos que un sitio web guarda en tu navegador. Otras tecnologías similares, como el almacenamiento local (localStorage),
        se tratan igual en esta política.
      </p>

      <H2>2. Qué usamos</H2>
      <table>
        <thead>
          <tr><th>Nombre</th><th>Tipo</th><th>Finalidad</th><th>Duración</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><code>cookie_consent</code> / <code>cookie_consent</code> (localStorage)</td>
            <td>Técnica (propia)</td>
            <td>Recordar tu elección sobre cookies.</td>
            <td>6 meses</td>
          </tr>
          <tr>
            <td><code>sb-…-auth-token</code> (Supabase)</td>
            <td>Técnica (propia)</td>
            <td>Mantener tu sesión iniciada en el área de cliente y en el panel.</td>
            <td>Sesión / hasta cerrar sesión</td>
          </tr>
          <tr>
            <td>Cookies de Stripe (<code>stripe.com</code>)</td>
            <td>Técnica / seguridad (terceros)</td>
            <td>Procesar el pago de forma segura y prevenir fraude en la página de pago alojada por Stripe.</td>
            <td>Según Stripe</td>
          </tr>
          <tr>
            <td>Vercel Web Analytics</td>
            <td>Estadística (sin cookies)</td>
            <td>Cuenta visitas y páginas vistas de forma anónima y agregada. No usa cookies ni te identifica, y no mide el panel de administración.</td>
            <td>No guarda cookies</td>
          </tr>
          <tr>
            <td>Meta Pixel (<code>_fbp</code>, <code>fr</code>)</td>
            <td>Publicidad (terceros)</td>
            <td>Medir conversiones y mejorar nuestros anuncios en Meta. <strong>Solo se cargan si aceptas las cookies de publicidad.</strong></td>
            <td>Hasta 90 días</td>
          </tr>
        </tbody>
      </table>
      <p>
        Las cookies técnicas son necesarias para que la web funcione y no requieren tu consentimiento. Las de análisis y publicidad solo se
        instalan si las aceptas, y no se activa ninguna antes de que elijas.
      </p>

      <H2>3. Cómo cambiar tu elección</H2>
      <p>
        Puedes aceptar, rechazar o personalizar las cookies en cualquier momento:{' '}
        <CookieSettingsLink className="underline underline-offset-2 text-white cursor-pointer" />. Retirar el consentimiento es tan fácil como
        darlo.
      </p>
      <p>
        También puedes borrarlas o bloquearlas desde tu navegador:{' '}
        <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">Chrome</a>,{' '}
        <a href="https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web-rastrear-preferencias" target="_blank" rel="noopener noreferrer">Firefox</a>,{' '}
        <a href="https://support.apple.com/es-es/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer">Safari</a>,{' '}
        <a href="https://support.microsoft.com/es-es/microsoft-edge/eliminar-las-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer">Edge</a>.
        Si bloqueas las técnicas, parte de la web (como iniciar sesión) puede dejar de funcionar.
      </p>

      <H2>4. Más información</H2>
      <p>
        Para saber cómo tratamos tus datos, consulta la <a href="/privacidad">Política de privacidad</a>. Puedes escribirnos a <Legal v={LEGAL.email} />.
        Puedes reclamar ante la Agencia Española de Protección de Datos (<a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">www.aepd.es</a>).
      </p>
    </LegalPage>
  );
}
