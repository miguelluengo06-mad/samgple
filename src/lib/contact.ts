/** Datos de contacto públicos de la agencia (el botón de WhatsApp de la web y la landing). */
export const WHATSAPP_NUMBER = '34692168981'; // 692 168 981, con prefijo de España y sin "+"
export const WHATSAPP_DISPLAY = '692 168 981';

export function whatsappUrl(text = 'Hola, quiero información sobre vuestros packs.'): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

/**
 * Número listo para wa.me (solo dígitos, con prefijo de país). Los visitantes suelen escribir su móvil
 * sin prefijo ("692 168 981"): para wa.me hay que añadirle el 34 de España o el enlace no abre el chat.
 */
export function whatsappDigits(phone: string | null | undefined): string {
  let digits = (phone || '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2); // 0034692168981 → 34692168981
  if (digits.length === 9 && /^[6-9]/.test(digits)) digits = `34${digits}`; // número español sin prefijo
  return digits;
}
