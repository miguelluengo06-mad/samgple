import type { Metadata } from 'next';
import LegalPage, { H2, Legal } from '@/components/legal/LegalPage';
import { LEGAL } from '@/lib/legal';

export const metadata: Metadata = { title: `Aviso legal — ${LEGAL.brand}`, robots: { index: true, follow: true } };

export default function AvisoLegalPage() {
  return (
    <LegalPage title="Aviso legal">
      <H2>1. Datos del titular</H2>
      <p>
        En cumplimiento de la Ley 34/2002, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), se informa de que
        el sitio web <strong>{LEGAL.domain}</strong> (en adelante, «la Web») pertenece a:
      </p>
      <ul>
        <li>Titular: <Legal v={LEGAL.name} /></li>
        <li>NIF/CIF: <Legal v={LEGAL.taxId} /></li>
        <li>Domicilio: <Legal v={LEGAL.address} /></li>
        <li>Email: <Legal v={LEGAL.email} /></li>
        {LEGAL.phone && <li>Teléfono: {LEGAL.phone}</li>}
        {LEGAL.registry && <li>Registro Mercantil: {LEGAL.registry}</li>}
        <li>Nombre comercial: {LEGAL.brand}</li>
      </ul>

      <H2>2. Objeto</H2>
      <p>
        La Web ofrece información sobre los servicios de {LEGAL.brand} —creación de vídeos con inteligencia artificial y contenido para negocios y
        empresas— y permite contratarlos online, solicitar propuestas, reservar llamadas y acceder a un área de cliente.
      </p>

      <H2>3. Condiciones de uso</H2>
      <p>
        El acceso y uso de la Web atribuye la condición de usuario e implica la aceptación de este Aviso legal. El usuario se compromete a hacer un
        uso adecuado de la Web y de sus contenidos, conforme a la ley, la buena fe y el orden público, y a no emplearla para fines ilícitos o que
        puedan dañar los derechos o intereses del titular o de terceros, ni para sobrecargar o dañar sus sistemas.
      </p>
      <p>
        La contratación de servicios se rige por los <a href="/terminos">Términos y condiciones</a>, y el tratamiento de datos personales por la{' '}
        <a href="/privacidad">Política de privacidad</a>.
      </p>

      <H2>4. Propiedad intelectual e industrial</H2>
      <p>
        Los textos, diseños, logotipos, marcas, imágenes, vídeos de ejemplo, código y demás elementos de la Web son titularidad de {LEGAL.brand} o de
        terceros que han autorizado su uso, y están protegidos por la normativa de propiedad intelectual e industrial. Queda prohibida su reproducción,
        distribución, comunicación pública o transformación sin autorización expresa, salvo lo permitido por la ley.
      </p>
      <p>
        Los derechos sobre los vídeos y materiales entregados a un cliente se regulan en los Términos y condiciones.
      </p>

      <H2>5. Responsabilidad</H2>
      <p>
        El titular procura que la información de la Web sea exacta y esté actualizada, pero no garantiza la ausencia de errores ni la disponibilidad
        continua del servicio, y podrá modificar o retirar contenidos sin previo aviso. No se responsabiliza de los daños derivados de interrupciones,
        fallos técnicos, virus o usos indebidos por terceros, salvo en los casos en que la ley lo imponga.
      </p>

      <H2>6. Enlaces</H2>
      <p>
        La Web puede contener enlaces a sitios de terceros (por ejemplo, la pasarela de pago de Stripe). El titular no controla ni responde de sus
        contenidos ni de sus políticas.
      </p>

      <H2>7. Legislación aplicable y jurisdicción</H2>
      <p>
        Este Aviso legal se rige por la legislación española. Para cualquier controversia, las partes se someten a los juzgados y tribunales que
        correspondan conforme a la normativa aplicable; si el usuario es consumidor, a los de su domicilio.
      </p>
      <p>
        Los consumidores de la Unión Europea pueden acudir a la plataforma de resolución de litigios en línea de la Comisión Europea:{' '}
        <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">ec.europa.eu/consumers/odr</a>.
      </p>
    </LegalPage>
  );
}
