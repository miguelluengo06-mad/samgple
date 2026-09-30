import type { Metadata } from 'next';
import GraciasClient from './GraciasClient';

export const metadata: Metadata = {
  title: 'Gracias por tu compra',
  robots: { index: false, follow: false },
};

export default function GraciasPage() {
  return <GraciasClient />;
}
