# samgple

Web y panel de administración de samgple: vídeos, influencers y anuncios con IA para negocios y ecommerce.

- **Web pública** (`/`) y **landing de anuncios** (`/landing`): packs, carrito y pago con Stripe.
- **Panel** (`/portal`): solicitudes, llamadas agendadas, ficha de cliente con avisos a su cuenta, compras y finanzas.
- **Avisos** a Telegram (solicitudes, llamadas y compras) y **Meta Pixel** con API de conversiones.

## Puesta en marcha

```bash
npm install
npm run dev      # http://localhost:3001
npm test
```

Variables de entorno principales: Supabase, `NEXT_PUBLIC_SITE_URL`, `STRIPE_PACKS_WEBHOOK_SECRET`,
`NEXT_PUBLIC_META_PIXEL_ID`, `META_CAPI_TOKEN`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.

## Documentación

- [Cobro de packs con Stripe](docs/STRIPE_PACKS.md)
- [Email con Resend](docs/EMAIL_RESEND.md)
- [Estudio de vídeos](docs/VIDEOS.md)
- [Passkeys para el equipo](docs/PASSKEYS.md)
