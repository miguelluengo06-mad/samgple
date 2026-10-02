# Avisos de leads por email con Resend

Cada vez que llega un lead (llamada agendada, Pack de Bienvenida, formulario de la landing o propuesta de la web)
o una compra pagada en Stripe, se envía un correo con el diseño de samgple a tu bandeja. El lead **siempre** se
guarda en el panel; el email es un aviso extra: si falla, no se pierde nada.

## Configurar (5 minutos)

1. Crea una cuenta en [resend.com](https://resend.com) y una **API key** (Sending access).
2. Verifica tu dominio en Resend → *Domains* (añade los registros DNS que te indica: SPF y DKIM).
3. Variables en el servidor:

```
RESEND_API_KEY=re_xxxxxxxx
RESEND_FROM=samgple <avisos@tu-dominio.com>
LEAD_NOTIFY_EMAIL=tu@correo.com        # opcional; varios separados por comas
```

4. Reinicia el servidor y haz una prueba: agenda una llamada desde la web o rellena el formulario de la landing.

Sin `RESEND_FROM` se usa `onboarding@resend.dev`, el remitente de pruebas de Resend, que **solo entrega al correo
de tu cuenta de Resend**. Sirve para probar, no para producción.

Sin `LEAD_NOTIFY_EMAIL`, el aviso va al email de la cuenta del panel (o a `ADMIN_EMAIL`).

## Orden de prioridad

1. Resend (`RESEND_API_KEY`)
2. SMTP guardado en Ajustes → Pagos y email
3. SMTP de las variables `SMTP_*` + `ADMIN_EMAIL`

## Qué correos se envían

| Correo | Cuándo | Asunto |
| --- | --- | --- |
| Llamada agendada | Alguien reserva hueco en la web | `Nueva llamada agendada — Nombre (Empresa) · Miércoles, 30 de septiembre · 10:30` |
| Pack de Bienvenida | Formulario de la landing (antes de pagar) | `Nuevo lead del Pack de Bienvenida — Empresa` |
| Lead de la landing | Formulario general de la landing | `Nuevo lead de la landing — Nombre (Empresa)` |
| Propuesta web | Formulario de propuesta de la web | `Nueva propuesta solicitada — Nombre (Empresa)` |
| Compra pagada | Pago completado en Stripe | `Nueva compra — Pack · 30 € (IVA incluido)` |

Cada correo lleva el teléfono, los botones **Abrir en el panel**, **Escribir por WhatsApp** y **Responder por email**,
las respuestas del formulario y el origen del anuncio (campaña, fuente…). «Responder» del correo va directo al cliente
(`reply-to`). El diseño está en `src/lib/emailTemplates.ts`; el envío, en `src/lib/leadMailer.ts`.

## Problemas típicos

- **No llega nada:** mira el log del servidor; los errores salen como `Resend 403: …`. Lo más común es un dominio sin verificar o
  un `RESEND_FROM` de un dominio que no es tuyo.
- **Llega a spam:** verifica SPF/DKIM del dominio en Resend y usa un remitente de tu propio dominio.
- **Envío duplicado:** cada aviso lleva una `Idempotency-Key` (`lead-<id>` / `order-<sesión>`), así que Resend ignora los reintentos.
