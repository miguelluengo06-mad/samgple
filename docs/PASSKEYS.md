# Passkeys para el equipo

Administradores y trabajadores entran al panel con **passkey** (huella, cara o PIN del dispositivo).
Los clientes siguen con su acceso normal (correo con enlace y contraseña).

## Cómo funciona
- La clave secreta se guarda **dentro del móvil/portátil** y nunca sale de ahí. La web solo guarda la clave pública.
- Entrar en el ordenador: botón **Entrar con huella o passkey** → el navegador muestra un QR → lo escaneas con el móvil
  y confirmas con la huella.
- Con **2 o más dispositivos** registrados, el acceso con passkey pasa a ser **obligatorio**:
  - la contraseña deja de abrir la administración (ni se prueba);
  - aunque alguien consiga una sesión por otro camino (contraseña robada, enlace de recuperar contraseña…),
    el servidor solo deja usar las rutas de administración a sesiones que entraron con passkey
    (`passkey_sessions`, ver `src/lib/agencyAccess.ts`).
- Con menos de 2 dispositivos todo sigue como antes (la contraseña vale): así no te quedas fuera mientras lo configuras.

## Puesta en marcha
1. Ejecuta `migrations/add-passkeys.sql` en Supabase → SQL Editor (también lo enseña Ajustes → Cuenta → Passkeys).
   Además cierra el acceso directo del navegador a `leads` y `team_members` y limita qué columnas de `profiles`
   puede cambiar un usuario.
2. Ajustes → Cuenta → **Passkeys** → *Añadir este dispositivo* (tu móvil, escaneando el QR) y repite con un segundo
   dispositivo (portátil, tablet u otro móvil).
3. Cierra sesión y entra con **Entrar con huella o passkey**.

## Si pierdes un dispositivo
- Entra con el otro y quita el perdido en Ajustes → Passkeys.
- Los passkeys de iPhone/Android se copian a tu cuenta de Apple/Google: un móvil nuevo los recupera.
- Como el proyecto de Supabase es tuyo, en el peor caso puedes vaciar la tabla `passkeys` de tu usuario desde el
  SQL Editor y volver a entrar con contraseña.

## Notas técnicas
- El dominio se toma de `NEXT_PUBLIC_SITE_URL` (un passkey de otra web no vale aquí).
- La sesión se abre en el servidor (enlace mágico de un solo uso generado y canjeado en la misma petición).
- Los fallos cuentan para el bloqueo de IPs (`/portal/security`).
