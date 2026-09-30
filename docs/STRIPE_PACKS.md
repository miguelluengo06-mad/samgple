# Cobrar los packs con Stripe

Los packs de la web (`/#precios`) y de la landing (`/landing`) se pagan con **Stripe Checkout**: el cliente pulsa
«Comprar ahora», paga en una pantalla segura de Stripe y vuelve a `/gracias`. La compra queda registrada sola en
**Portal → Solicitudes** (estado «Ganada», con el importe y un enlace al pago en Stripe).

**Todos los precios llevan el IVA incluido.** Lo que ve el cliente en la web es exactamente lo que paga. Los
precios y textos se cambian en un solo sitio: `src/lib/packs.ts`.

## 1. Conectar la cuenta

1. En Stripe → **Desarrolladores → Claves API**, copia la **clave secreta** (`sk_test_…` para probar, `sk_live_…` para cobrar).
2. En el panel: **Ajustes → Conexiones → Cobros con Stripe**, pégala y pulsa *Conectar Stripe*. Se guarda cifrada.
   - Alternativa: variable de entorno `STRIPE_PACKS_SECRET_KEY` (solo se usa si no hay clave en el panel).
3. Define `NEXT_PUBLIC_SITE_URL` con la URL pública de la web (Stripe vuelve a ella tras el pago).

## 2. Webhook (imprescindible)

Garantiza que la compra se registre aunque el cliente cierre la pestaña antes de volver.

1. Stripe → **Desarrolladores → Webhooks → Añadir endpoint**.
2. URL: `https://TU-DOMINIO/api/webhooks/pack-payments`
3. Eventos: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `charge.refunded` e `invoice.payment_failed`. Los reembolsos y cobros fallidos de suscripción quedan anotados en la solicitud.
4. Copia el **secreto de firma** (`whsec_…`) a la variable `STRIPE_PACKS_WEBHOOK_SECRET` y reinicia el servidor.

El registro es idempotente: si llegan a la vez el webhook y la página de gracias, la compra se guarda una sola vez.
En local puedes usar `stripe listen --forward-to localhost:3001/api/webhooks/pack-payments`.

## 3. Facturas e IVA

- Pagos únicos: se genera factura automática con el IVA desglosado (`invoice_creation`). Las suscripciones mensuales generan su factura en cada cobro.
- Precios con IVA incluido (`tax_behavior: inclusive`): el cliente paga la cifra de la web; el IVA se desglosa dentro.
- El cliente puede indicar el NIF de su empresa en el pago para que salga en la factura.
- En Stripe → **Ajustes → Facturación**, rellena los datos fiscales de la empresa (nombre, NIF, dirección) y activa el envío de recibos por email.
- Recomendado para vender a empresas de otros países de la UE: `STRIPE_AUTOMATIC_TAX=true` (Stripe Tax calcula el IVA y aplica la inversión del sujeto pasivo con NIF intracomunitario). Antes hay que completar **Stripe → Tax → Ajustes** (dirección de la sede y registros fiscales); si no, Checkout dará error.

## 4. Probar antes de cobrar

Con claves `sk_test_…`:

| Tarjeta | Resultado |
| --- | --- |
| `4242 4242 4242 4242` | Pago correcto |
| `4000 0025 0000 3155` | Pide autenticación 3D Secure |
| `4000 0000 0000 9995` | Rechazada (sin fondos) |

Cualquier fecha futura, cualquier CVC. Comprueba: importe correcto, redirección a `/gracias`, compra en Solicitudes, y el
email de aviso (si tienes SMTP configurado en Ajustes).

## 5. Salir a producción

- [ ] Clave `sk_live_…` guardada en el panel.
- [ ] Endpoint de webhook creado **en modo real** (los de test y real son distintos) con su nuevo `whsec_…`.
- [ ] Datos fiscales y logo en Stripe → Ajustes → Facturación / Marca.
- [ ] Páginas legales enlazadas (aviso legal, privacidad, condiciones y desistimiento) — Stripe las pide para cobrar a consumidores.
- [ ] Compra real de prueba de 1 pack y reembolso desde Stripe.
- [ ] Contador de plazas del Pack de Bienvenida al día (`WELCOME_SPOTS_LEFT` en `src/lib/packs.ts`).

## Cómo está montado

| Pieza | Archivo |
| --- | --- |
| Catálogo y precios (fuente única) | `src/lib/packs.ts` |
| Sesión de Checkout, registro del pedido, aviso por email | `src/lib/packCheckout.ts` |
| Crear el pago (POST) | `src/app/api/public/pack-checkout/route.ts` |
| Comprobar el pago al volver | `src/app/api/public/pack-checkout/confirm/route.ts` |
| Webhook | `src/app/api/webhooks/pack-payments/route.ts` |
| Botón «Comprar ahora» | `src/components/home/BuyPack.tsx` |
| Página de gracias | `src/app/gracias/` |

Nota: se usa Checkout **alojado** (redirige a stripe.com), por lo que no hay que cambiar la CSP. Si algún día quieres
Checkout incrustado en la propia web, habría que permitir `js.stripe.com` en `script-src`/`frame-src` en `next.config.ts`.
