# Estudio de vídeos

Cómo funciona el saldo de vídeos y el pedido de cada cliente.

## Flujo

1. **Compra** → al pagarse un pack (Stripe), se apuntan en el saldo del cliente los vídeos de ese pack
   (Bienvenida 2 · UGC 5/10/20 · Influencer IA 9/14/27 · Clonación IA 6/12/24 · Vídeo suelto 1).
   La compra solo cuenta una vez, aunque el webhook y `/gracias` lleguen a la vez.
2. **Cuenta** → si el cliente no tiene cuenta, se crea y recibe un correo con un botón para elegir su contraseña
   (`/auth/confirm` → `/auth/set-password`). Nunca se envía una contraseña por correo.
3. **Pedido** → en su panel (`/cuenta`: Inicio, Mis vídeos, Avatares, Avisos, Compras, Llamadas, Ayuda y Ajustes) el cliente elige un avatar, cuenta qué quiere que diga (máx. 45 s, ≈ 112 palabras),
   y opcionalmente producto o web, tono, llamada a la acción y un enlace de Google Drive con sus archivos.
   Al enviarlo se descuenta 1 vídeo.
4. **Seguimiento** → Solicitado → Preparando el guion → Guion para su visto bueno → En producción → Entregado.
   El cliente aprueba el guion o pide cambios, y puede cancelar en cualquier momento antes de que pase a producción (el vídeo vuelve al saldo).
5. **Agencia** → `/portal/videos`: bandeja de pedidos, guion, enlace del vídeo terminado, notas internas,
   ajuste del saldo, y el catálogo de avatares (se pegan enlaces de imagen).

## Puesta en marcha

1. Ejecuta `migrations/add-video-studio.sql` en Supabase → SQL Editor (o cópialo desde `/portal/videos`).
2. En `/portal/videos` → **Avatares**, añade los del catálogo.
3. Pulsa **Sincronizar compras** para apuntar los vídeos de compras anteriores.

El saldo es un libro de movimientos (`video_credit_ledger`): compras, pedidos, devoluciones y ajustes manuales.
