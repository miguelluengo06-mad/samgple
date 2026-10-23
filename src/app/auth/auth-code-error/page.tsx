'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TriangleAlert } from 'lucide-react';
import AuthShell from '@/components/studio/AuthShell';

export default function AuthErrorPage() {
  const router = useRouter();

  // Redirect to home after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/');
    }, 10000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <AuthShell title="Esa toma no *salió.*" kicker="/ Enlace no válido">
      <div className="space-y-6">
        <TriangleAlert className="h-10 w-10 text-[#b42318]" aria-hidden="true" />

        <h2 className="text-3xl font-bold text-white">No hemos podido verificar el enlace</h2>

        <p className="text-white/60">
          El enlace ha caducado, ya se usó o se abrió en un navegador distinto al del registro. Si acabas de
          confirmar tu email, prueba a acceder directamente con tu email y contraseña.
        </p>

        <div className="space-y-3">
          <Link href="/" className="btn-minimal-filled w-full flex justify-center py-3 px-4 rounded-lg text-sm font-semibold">
            Volver a la web
          </Link>

          <button onClick={() => router.push('/auth')} className="btn-minimal w-full flex justify-center py-3 px-4 rounded-lg text-sm font-medium">
            Ir a acceder
          </button>
        </div>

        <p className="text-sm text-white/50">Volverás automáticamente a la web en 10 segundos.</p>
      </div>
    </AuthShell>
  );
}
