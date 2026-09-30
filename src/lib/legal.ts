/**
 * Datos legales del titular de la web (Aviso legal, Privacidad, Cookies y Términos los leen de aquí).
 * Edita este archivo para cambiarlos. Un dato que empiece por «[COMPLETAR» se enseña resaltado en amarillo
 * en las páginas legales, para que no se publique a medias sin darte cuenta.
 */

export const LEGAL = {
  /** Nombre comercial */
  brand: 'samgple',
  /** Dominio de la web */
  domain: 'samgple.com',
  /** Razón social o nombre y apellidos del autónomo */
  name: 'SAMGPLE VID',
  /** NIF / CIF */
  taxId: '02576732L',
  /** Domicilio completo */
  address: 'Calle Carlos Trías Bertrán 13, Madrid, España',
  /** Email de contacto y de ejercicio de derechos de protección de datos */
  email: 'soporte@samgple.com',
  /** Teléfono (opcional) */
  phone: '',
  /** Datos de inscripción en el Registro Mercantil (solo sociedades; opcional) */
  registry: '',
  /** Fecha de la última revisión de los textos */
  updated: '30 de septiembre de 2026',
} as const;

export const isPending = (v: string) => v.startsWith('[COMPLETAR');
