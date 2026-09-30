import type { Metadata } from 'next';
import LegalPage, { H2, Legal } from '@/components/legal/LegalPage';
import { LEGAL } from '@/lib/legal';

export const metadata: Metadata = { title: `Política de privacidad — ${LEGAL.brand}`, robots: { index: true, follow: true } };

export default function PrivacidadPage() {
  return (
    <LegalPage title="Política de privacidad">
      <p>
        En {LEGAL.brand} tratamos tus datos personales conforme al Reglamento (UE) 2016/679 (RGPD) y a la Ley Orgánica 3/2018 (LOPDGDD). Esta política
        explica qué datos recogemos, para qué, con qué base legal y qué derechos tienes.
      </p>

      <H2>1. Responsable del tratamiento</H2>
      <ul>
        <li>Responsable: <Legal v={LEGAL.name} /> — NIF/CIF: <Legal v={LEGAL.taxId} /></li>
        <li>Domicilio: <Legal v={LEGAL.address} /></li>
        <li>Email de contacto y de ejercicio de derechos: <Legal v={LEGAL.email} /></li>
      </ul>

      <H2>2. Qué datos tratamos, para qué y con qué base legal</H2>
      <table>
        <thead>
          <tr><th>Finalidad</th><th>Datos</th><th>Base legal</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Atender solicitudes de propuesta y reservas de llamada</td>
            <td>Nombre, email, teléfono, empresa, mensaje, datos de la reserva</td>
            <td>Medidas precontractuales a petición tuya (art. 6.1.b RGPD)</td>
          </tr>
          <tr>
            <td>Gestionar compras, cobros, suscripciones y facturación</td>
            <td>Nombre, email, teléfono, dirección de facturación, NIF de empresa, importe y estado del pago (los datos de tarjeta los trata solo Stripe)</td>
            <td>Ejecución del contrato (art. 6.1.b) y obligaciones legales fiscales y contables (art. 6.1.c)</td>
          </tr>
          <tr>
            <td>Crear y mantener tu cuenta de cliente y atenderte por soporte</td>
            <td>Email, nombre, historial de compras, mensajes que nos envías</td>
            <td>Ejecución del contrato (art. 6.1.b) e interés legítimo en atender tus consultas (art. 6.1.f)</td>
          </tr>
          <tr>
            <td>Medir el rendimiento de la web y de nuestros anuncios</td>
            <td>Datos de navegación e identificadores de publicidad (solo si aceptas esas cookies)</td>
            <td>Tu consentimiento (art. 6.1.a), que puedes retirar en cualquier momento</td>
          </tr>
          <tr>
            <td>Seguridad de la web y prevención del fraude</td>
            <td>Dirección IP y registros técnicos</td>
            <td>Interés legítimo (art. 6.1.f)</td>
          </tr>
        </tbody>
      </table>
      <p>
        No tomamos decisiones automatizadas con efectos jurídicos sobre ti. Los datos que nos facilitas deben ser veraces; si no los aportas, es
        posible que no podamos atender tu solicitud o completar la compra.
      </p>

      <H2>3. Destinatarios y encargados del tratamiento</H2>
      <p>Solo compartimos datos con los proveedores necesarios para prestarte el servicio, con los que tenemos un contrato de encargado del tratamiento:</p>
      <ul>
        <li><strong>Stripe Payments Europe, Ltd.</strong> — procesamiento de pagos y facturas.</li>
        <li><strong>Supabase</strong> y el proveedor de alojamiento de la Web (p. ej. Vercel) — almacenamiento de datos y hospedaje.</li>
        <li>Proveedor de correo electrónico transaccional — envío de avisos, facturas e invitaciones.</li>
        <li>Herramientas de comunicación que utilices para hablar con nosotros (WhatsApp, Telegram, videollamadas), bajo sus propias políticas.</li>
        <li>Asesoría fiscal y contable, y las Administraciones públicas cuando la ley lo exija.</li>
      </ul>
      <p>No vendemos tus datos a terceros.</p>

      <H2>4. Transferencias internacionales</H2>
      <p>
        Algunos de estos proveedores pueden tratar datos fuera del Espacio Económico Europeo (por ejemplo, en Estados Unidos). En ese caso, la
        transferencia se ampara en una decisión de adecuación de la Comisión Europea (Marco de Privacidad de Datos UE-EE. UU.) o en cláusulas
        contractuales tipo.
      </p>

      <H2>5. Plazo de conservación</H2>
      <ul>
        <li>Solicitudes y reservas sin compra: hasta 24 meses desde el último contacto, salvo que pidas antes su supresión.</li>
        <li>Datos de compras y facturas: el tiempo que exija la normativa mercantil y tributaria (generalmente entre 4 y 6 años).</li>
        <li>Cuenta de cliente: mientras esté activa, y después, bloqueados durante los plazos de prescripción de posibles responsabilidades.</li>
        <li>Consentimiento de cookies: 6 meses.</li>
      </ul>

      <H2>6. Tus derechos</H2>
      <p>
        Puedes ejercer los derechos de acceso, rectificación, supresión, oposición, limitación del tratamiento y portabilidad, y retirar tu
        consentimiento cuando lo hayas dado, escribiendo a <Legal v={LEGAL.email} /> e indicando el derecho que quieres ejercer. Podemos pedirte que
        acredites tu identidad.
      </p>
      <p>
        Si consideras que no hemos tratado tus datos correctamente, puedes presentar una reclamación ante la Agencia Española de Protección de Datos
        (<a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">www.aepd.es</a>).
      </p>

      <H2>7. Seguridad</H2>
      <p>
        Aplicamos medidas técnicas y organizativas adecuadas: conexiones cifradas (HTTPS), control de accesos, cifrado de credenciales sensibles y
        copias de seguridad. Los datos de tu tarjeta nunca pasan por nuestros servidores.
      </p>

      <H2>8. Menores</H2>
      <p>Nuestros servicios están dirigidos a empresas y mayores de edad. No recogemos conscientemente datos de menores de 14 años.</p>

      <H2>9. Cambios en esta política</H2>
      <p>Podemos actualizar esta política; la fecha de la última revisión figura arriba. Si el cambio es relevante, te lo comunicaremos.</p>
    </LegalPage>
  );
}
