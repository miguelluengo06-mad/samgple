import { randomInt } from 'crypto';

// Sin caracteres que se confunden al leerlos o dictarlos (0/O, 1/l/I)
const LETTERS = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';

/** Contraseña inicial para un cliente: 10 caracteres fáciles de copiar, con letras y al menos 2 cifras. */
export function generateAccessPassword(length = 10): string {
  const chars: string[] = [];
  for (let i = 0; i < length; i++) {
    const pool = i % 4 === 3 ? DIGITS : LETTERS;
    chars.push(pool[randomInt(pool.length)]);
  }
  // Mezcla para que las cifras no queden siempre en las mismas posiciones
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}
