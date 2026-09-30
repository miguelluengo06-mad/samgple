import type { Metadata } from 'next';
import LegalPage, { H2, Legal } from '@/components/legal/LegalPage';
import { LEGAL } from '@/lib/legal';

export const metadata: Metadata = { title: `Términos y condiciones — ${LEGAL.brand}`, robots: { index: true, follow: true } };

export default function TerminosPage() {
  return (
    <LegalPage title="Términos y condiciones">
      <p>
        Estas condiciones regulan la contratación de los servicios que <Legal v={LEGAL.name} /> (NIF/CIF <Legal v={LEGAL.taxId} />, en adelante
        «{LEGAL.brand}») ofrece a través de {LEGAL.domain}. Al pulsar «Comprar» o contratar un servicio, aceptas estas condiciones.
      </p>

      <H2>1. Servicios</H2>
      <p>
        {LEGAL.brand} crea vídeos y contenido para negocios y empresas, utilizando herramientas de inteligencia artificial y edición profesional. El
        contenido, duración, número de piezas y plazo de entrega de cada pack son los indicados en su descripción en la Web en el momento de la compra.
      </p>

      <H2>2. Contratación y precios</H2>
      <ul>
        <li>Todos los precios se muestran en euros e <strong>incluyen el IVA</strong>, salvo que se indique lo contrario.</li>
        <li>El contrato se perfecciona cuando completas el pago y recibes la confirmación por email. {LEGAL.brand} puede rechazar un pedido por causa justificada, reembolsando lo cobrado.</li>
        <li>Recibirás una factura con los datos que indiques en el pago (por ejemplo, el NIF de tu empresa). Revísalos: no podremos modificarla si son incorrectos tras un plazo razonable.</li>
        <li>Ofertas y promociones (p. ej. el Pack de Bienvenida) tienen plazas o condiciones limitadas y pueden retirarse al agotarse.</li>
      </ul>

      <H2>3. Pago</H2>
      <p>
        El pago se realiza a través de <strong>Stripe</strong>, una pasarela segura. {LEGAL.brand} no almacena los datos de tu tarjeta. Los pagos
        pueden requerir autenticación reforzada (3D Secure) de tu banco.
      </p>

      <H2>4. Suscripciones mensuales</H2>
      <p>
        Los planes mensuales se renuevan automáticamente cada mes hasta que los canceles. Puedes cancelarlos en cualquier momento escribiendo a{' '}
        <Legal v={LEGAL.email} /> o desde tu área de cliente cuando esté disponible; la cancelación surte efecto al final del periodo ya pagado y no
        genera reembolso del mes en curso. Si un cobro falla, reintentaremos el pago y podremos suspender el servicio hasta regularizarlo.
      </p>

      <H2>5. Entrega y colaboración del cliente</H2>
      <p>
        Los plazos de entrega son orientativos y empiezan cuando recibimos todo el material y la información necesarios. El cliente se compromete a
        facilitarlos a tiempo y a garantizar que tiene derecho a usar los logotipos, imágenes, textos, voces y marcas que nos entregue. Las
        revisiones incluidas son las indicadas en cada pack; las adicionales pueden tener coste.
      </p>

      <H2>6. Contenido generado con inteligencia artificial</H2>
      <p>
        Los vídeos pueden incluir imágenes, voces o escenas generadas con IA. {LEGAL.brand} informa de ello y el cliente es responsable de indicar, cuando
        la ley o la plataforma de publicación lo exijan, que el contenido está generado o modificado con IA. El cliente no debe pedirnos contenido que
        suplante a personas reales sin su consentimiento, que sea engañoso, ilícito o que vulnere derechos de terceros; podremos rechazarlo.
      </p>

      <H2>7. Propiedad intelectual</H2>
      <p>
        Una vez pagado íntegramente el servicio, {LEGAL.brand} cede al cliente una licencia de uso de los vídeos y materiales finales entregados para su
        actividad comercial, en todo el mundo y sin límite de tiempo, salvo las limitaciones de las licencias de terceros (música, fuentes, herramientas) que
        se indiquen. {LEGAL.brand} conserva los derechos sobre sus métodos, plantillas y material de trabajo, y podrá mostrar el resultado como ejemplo de su
        trabajo salvo que el cliente se oponga por escrito.
      </p>

      <H2>8. Derecho de desistimiento</H2>
      <p>
        <strong>Clientes empresa o profesionales:</strong> al ser contratación entre profesionales, no existe derecho legal de desistimiento; cualquier
        devolución se valorará caso por caso.
      </p>
      <p>
        <strong>Consumidores y usuarios:</strong> tienes 14 días naturales para desistir del contrato sin indicar motivo. Como se trata de un servicio
        personalizado que empieza a prestarse de inmediato, al contratar solicitas expresamente que la ejecución comience ya y reconoces que, una vez
        completamente ejecutado el servicio, pierdes el derecho de desistimiento; si desistes antes, abonarás la parte proporcional del servicio ya prestado.
        Para desistir, escribe a <Legal v={LEGAL.email} /> indicando tu pedido.
      </p>

      <H2>9. Garantía y responsabilidad</H2>
      <p>
        {LEGAL.brand} se compromete a entregar el servicio con la diligencia profesional debida y conforme a lo descrito. Si no cumple lo contratado, el
        cliente puede reclamar su corrección o, en su defecto, el reembolso proporcional. {LEGAL.brand} no garantiza resultados comerciales concretos
        (ventas, visualizaciones, rendimiento de anuncios), que dependen de factores ajenos. Salvo dolo o negligencia grave y lo que la ley
        imponga, la responsabilidad total de {LEGAL.brand} se limita al importe pagado por el servicio afectado.
      </p>

      <H2>10. Cuenta de cliente</H2>
      <p>
        El acceso al área de cliente es personal y se facilita por invitación. Eres responsable de custodiar tus credenciales y de avisarnos si sospechas un
        uso no autorizado.
      </p>

      <H2>11. Protección de datos</H2>
      <p>
        Tratamos tus datos conforme a la <a href="/privacidad">Política de privacidad</a> y usamos cookies según la <a href="/cookies">Política de cookies</a>.
      </p>

      <H2>12. Modificaciones, ley aplicable y reclamaciones</H2>
      <p>
        Podemos modificar estas condiciones; se aplicarán a las contrataciones posteriores a su publicación. El contrato se rige por la legislación
        española. Los consumidores pueden acudir a los tribunales de su domicilio y a la plataforma europea de resolución de litigios en línea
        (<a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">ec.europa.eu/consumers/odr</a>). Para cualquier reclamación,
        escribe a <Legal v={LEGAL.email} />.
      </p>
    </LegalPage>
  );
}
