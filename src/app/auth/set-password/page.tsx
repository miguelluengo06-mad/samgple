'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import { supabase } from '@/lib/supabase';
import KineticWordmark from '@/components/home/KineticWordmark';

/** Pantalla a la que lleva el correo de bienvenida: el cliente elige su contraseña y entra. */
export default function SetPasswordPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [brand, setBrand] = useState('samgple');

  useEffect(() => {
    fetch('/api/public/branding')
      .then((r) => r.json())
      .then((d) => d.business_name && setBrand(d.business_name))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
  }, [loading, user, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 10) return setError('Usa al menos 10 caracteres.');
    if (password !== confirm) return setError('Las contraseñas no coinciden.');
    setSaving(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setSaving(false);
      return setError(/same|different/i.test(err.message) ? 'Elige una contraseña distinta a la anterior.' : 'No se pudo guardar la contraseña. Inténtalo de nuevo.');
    }
    router.replace('/portal');
  };

  if (loading || !user) return <div className="home-root min-h-screen" />;

  return (
    <div className="home-root min-h-screen flex items-center justify-center px-4 py-16">
      <div className="home-slab w-full max-w-md px-6 sm:px-10 py-10">
        <div className="flex justify-center mb-6">
          <Link href="/" aria-label="Ir a la web"><KineticWordmark name={brand} className="text-2xl" /></Link>
        </div>
        <h1 className="text-2xl font-bold text-center text-white">Crea tu contraseña</h1>
        <p className="text-sm text-white/60 text-center mt-2">Con ella entrarás a tu panel, donde están tus vídeos disponibles.</p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="pw" className="block text-sm font-medium text-white/80 mb-1">Contraseña</label>
            <input id="pw" type="password" autoComplete="new-password" required minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} className="block w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2.5 text-white sm:text-sm" />
          </div>
          <div>
            <label htmlFor="pw2" className="block text-sm font-medium text-white/80 mb-1">Repítela</label>
            <input id="pw2" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className="block w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2.5 text-white sm:text-sm" />
          </div>
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={saving} className="btn-minimal-filled w-full rounded-lg py-3 text-sm font-semibold cursor-pointer disabled:opacity-50">
            {saving ? 'Guardando…' : 'Guardar y entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
