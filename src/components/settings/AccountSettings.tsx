'use client';

import { useEffect, useState } from 'react';
import { KeyRound, Loader2, LogOut, UserRound } from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

type Msg = { ok: boolean; text: string } | null;

const field = 'w-full rounded-2xl border px-4 py-3 text-sm outline-none';

/** Tu nombre, tu email, tu contraseña y cerrar sesión (cliente y equipo). */
export function AccountSettings() {
  const { user, signOut } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<Msg>(null);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<Msg>(null);

  useEffect(() => {
    if (!user) return;
    setEmail(user.email || '');
    setFullName(String(user.user_metadata?.full_name || ''));
  }, [user]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const emailChanged = email.trim().toLowerCase() !== (user?.email || '').toLowerCase();
      const nameChanged = fullName.trim() !== String(user?.user_metadata?.full_name || '');
      if (!emailChanged && !nameChanged) {
        setProfileMsg({ ok: true, text: 'No hay cambios que guardar.' });
        return;
      }
      if (emailChanged) {
        const { error } = await supabase.auth.updateUser({ email: email.trim() });
        if (error) throw error;
      }
      if (nameChanged) {
        const { error } = await supabase.auth.updateUser({ data: { full_name: fullName.trim() } });
        if (error) throw error;
      }
      setProfileMsg({ ok: true, text: emailChanged ? 'Guardado. Te hemos enviado un enlace al nuevo email para confirmarlo.' : 'Guardado.' });
    } catch (err) {
      setProfileMsg({ ok: false, text: err instanceof Error ? err.message : 'No se pudo guardar.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (password.length < 10) return setPwMsg({ ok: false, text: 'Usa al menos 10 caracteres.' });
    if (password !== confirm) return setPwMsg({ ok: false, text: 'Las contraseñas no coinciden.' });
    setSavingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword('');
      setConfirm('');
      setPwMsg({ ok: true, text: 'Contraseña actualizada.' });
    } catch (err) {
      const m = err instanceof Error ? err.message : '';
      setPwMsg({ ok: false, text: /same|different/i.test(m) ? 'Elige una contraseña distinta a la actual.' : 'No se pudo cambiar la contraseña.' });
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-5">
      <form onSubmit={saveProfile} className="card-liquid rounded-3xl p-5 md:p-6 space-y-4">
        <h3 className="pn-title flex items-center gap-2"><UserRound className="w-3.5 h-3.5 text-[var(--signal)]" /> Tus datos</h3>
        <label className="block"><span className="text-xs text-white/55">Nombre</span><input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={120} autoComplete="name" className={cn(field, 'mt-1.5')} /></label>
        <label className="block"><span className="text-xs text-white/55">Email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={cn(field, 'mt-1.5')} /></label>
        <div className="flex items-center gap-3 flex-wrap">
          <button type="submit" disabled={savingProfile} className="inline-flex items-center gap-2 px-5 h-11 rounded-full portal-cta text-sm cursor-pointer disabled:opacity-50">{savingProfile && <Loader2 className="w-4 h-4 animate-spin" />} Guardar</button>
          {profileMsg && <p role="status" className={cn('text-xs', profileMsg.ok ? 'text-green-400' : 'text-red-400')}>{profileMsg.text}</p>}
        </div>
      </form>

      <form onSubmit={savePassword} className="card-liquid rounded-3xl p-5 md:p-6 space-y-4">
        <h3 className="pn-title flex items-center gap-2"><KeyRound className="w-3.5 h-3.5 text-[var(--signal)]" /> Contraseña</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block"><span className="text-xs text-white/55">Nueva contraseña</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className={cn(field, 'mt-1.5')} /></label>
          <label className="block"><span className="text-xs text-white/55">Repítela</span><input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" className={cn(field, 'mt-1.5')} /></label>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button type="submit" disabled={savingPw || !password} className="inline-flex items-center gap-2 px-5 h-11 rounded-full portal-cta text-sm cursor-pointer disabled:opacity-50">{savingPw && <Loader2 className="w-4 h-4 animate-spin" />} Cambiar contraseña</button>
          {pwMsg && <p role="status" className={cn('text-xs', pwMsg.ok ? 'text-green-400' : 'text-red-400')}>{pwMsg.text}</p>}
        </div>
      </form>

      <div className="card-liquid rounded-3xl p-5 md:p-6 flex items-center justify-between gap-3">
        <div><h3 className="pn-title">Sesión</h3><p className="text-sm text-white/60 mt-1.5">Cierra la sesión en este dispositivo.</p></div>
        <button onClick={async () => { await signOut(); window.location.href = '/auth'; }} className="inline-flex items-center gap-2 px-5 h-11 rounded-full border border-[var(--portal-line-strong)] text-sm hover:border-[var(--signal)] cursor-pointer"><LogOut className="w-4 h-4" /> Cerrar sesión</button>
      </div>
    </div>
  );
}
