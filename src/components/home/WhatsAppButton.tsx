import { WHATSAPP_DISPLAY, whatsappUrl } from '@/lib/contact';

/** Botón flotante de WhatsApp (abre el chat con la agencia). `lift` lo sube en móvil para no tapar la barra de CTA de la landing. */
export default function WhatsAppButton({ lift = false, message }: { lift?: boolean; message?: string }) {
  return (
    <a
      href={whatsappUrl(message)}
      target="_blank"
      rel="noopener noreferrer"
      className={`wa-float${lift ? ' wa-float--lift' : ''}`}
      aria-label={`Escríbenos por WhatsApp al ${WHATSAPP_DISPLAY}`}
    >
      <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <path
          fill="currentColor"
          d="M16.04 3C9.4 3 4 8.39 4 15.03c0 2.12.55 4.19 1.6 6.02L4 29l8.13-1.56a12.03 12.03 0 0 0 3.9.65h.01C22.68 28.09 28 22.7 28 16.06 28 9.4 22.68 3 16.04 3Zm0 22.1h-.01c-1.2 0-2.38-.32-3.4-.93l-.24-.15-4.83.93.98-4.71-.16-.25a9.02 9.02 0 0 1-1.4-4.84c0-4.98 4.06-9.03 9.05-9.03 2.4 0 4.66.94 6.36 2.64a8.93 8.93 0 0 1 2.63 6.4c0 4.98-4.07 8.94-9 8.94Zm4.95-6.76c-.27-.14-1.6-.79-1.85-.88-.25-.09-.43-.14-.61.14-.18.27-.7.88-.86 1.06-.16.18-.32.2-.59.07-.27-.14-1.15-.42-2.19-1.35-.81-.72-1.35-1.61-1.51-1.88-.16-.27-.02-.42.12-.55.12-.12.27-.32.41-.48.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.14-.61-1.47-.84-2.02-.22-.53-.44-.46-.61-.47h-.52c-.18 0-.48.07-.73.34-.25.27-.95.93-.95 2.27 0 1.34.98 2.64 1.11 2.82.14.18 1.92 2.94 4.66 4.12.65.28 1.16.45 1.56.58.65.21 1.25.18 1.72.11.52-.08 1.6-.65 1.82-1.28.23-.63.23-1.17.16-1.28-.07-.11-.25-.18-.52-.32Z"
        />
      </svg>
      <span className="wa-float__label">WhatsApp</span>
    </a>
  );
}
