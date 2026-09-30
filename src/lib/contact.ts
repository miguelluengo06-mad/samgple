/** Utilidades de contacto. La agencia ya no publica ningún teléfono en la web. */

/**
 * Número listo para wa.me (solo dígitos, con prefijo de país). Los visitantes suelen escribir su móvil
 * sin prefijo ("600 000 000"): para wa.me hay que añadirle el 34 de España o el enlace no abre el chat.
 */
export function whatsappDigits(phone: string | null | undefined): string {
  let digits = (phone || '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2); // 0034600000000 → 34600000000
  if (digits.length === 9 && /^[6-9]/.test(digits)) digits = `34${digits}`; // número español sin prefijo
  return digits;
}
