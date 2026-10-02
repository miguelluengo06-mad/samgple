'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Fingerprint, Loader2, ShieldCheck, Smartphone, Trash2 } from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
import { PASSKEYS_REQUIRED, PASSKEY_SETUP_SQL } from '@/lib/passkeyConstants';
import { passkeysSupported, registerPasskey } from '@/lib/passkeyClient';
import { timeAgo } from '@/components/portal/leadMeta';
import { cn } from '@/lib/utils';

interface Row {
  id: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
  backed_up: boolean;
}

/** Passkeys del equipo: registrar dispositivos (huella, cara o PIN) y ver si el acceso con passkey ya es obligatorio. */
export function PasskeysSettings() {
  const { session } = useAuth();
  const token = session?.access_token;
  const [rows, setRows] = useState<Row[] | null>(null);
  const [setup, setSetup] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => setSupported(passkeysSupported()), []);

  const load = useCallback(async () => {
    if (!token) return;
    const res = await fetch('/api/auth/passkey', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setRows(data.passkeys || []);
      setSetup(!!data.setup);
    } else setRows([]);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!token) return;
    setBusy(true);
    setMsg(null);
    try {
      const count = await registerPasskey(token, name.trim() || 'Mi dispositivo');
      setName('');
      setMsg({
        ok: true,
        text: count >= PASSKEYS_REQUIRED ? 'Listo. Ya tienes dos dispositivos: desde ahora la administración solo se abre con passkey.' : `Dispositivo guardado. Añade otro más (${count} de ${PASSKEYS_REQUIRED}) para activar el acceso obligatorio.`,
      });
      await load();
    } catch (err) {
      const e = err as Error & { setup?: boolean };
      if (e.setup) setSetup(true);
      setMsg({ ok: false, text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (r: Row) => {
    if (!token || !confirm(`¿Quitar «${r.name}»? Si te quedas con menos de ${PASSKEYS_REQUIRED}, la contraseña volverá a valer para entrar.`)) return;
    await fetch(`/api/auth/passkey?id=${r.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    await load();
  };

  if (setup) {
    return (
      <div className="card-liquid rounded-3xl p-5 md:p-6 space-y-4">
        <p className="text-sm text-white/65">Para activar los passkeys hace falta crear unas tablas. Copia este código, pégalo en <b>Supabase → SQL Editor → Run</b> y vuelve aquí.</p>
        <pre className="whitespace-pre-wrap break-words rounded-2xl border border-white/10 bg-black/30 p-4 text-xs leading-relaxed font-mono max-h-64 overflow-y-auto">{PASSKEY_SETUP_SQL}</pre>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={async () => { try { await navigator.clipboard.writeText(PASSKEY_SETUP_SQL); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ } }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full portal-cta text-sm cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? 'Copiado' : 'Copiar SQL'}
          </button>
          <button onClick={() => { setSetup(false); load(); }} className="px-4 py-2.5 rounded-full border border-white/15 text-sm hover:border-[var(--portal-line-strong)] cursor-pointer">Ya lo he ejecutado</button>
        </div>
      </div>
    );
  }

  const count = rows?.length ?? 0;
  const active = count >= PASSKEYS_REQUIRED;

  return (
    <div className="card-liquid rounded-3xl p-5 md:p-6 space-y-5">
      <div className={cn('rounded-2xl border p-4 flex items-start gap-3', active ? 'border-green-400/30 bg-green-400/[0.06]' : 'border-yellow-400/30 bg-yellow-400/[0.06]')}>
        {active ? <ShieldCheck className="w-5 h-5 text-green-400 shrink-0 mt-0.5" /> : <Fingerprint className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />}
        <div className="text-sm">
          <div className="font-semibold">{active ? 'Acceso con passkey obligatorio' : count === 0 ? 'Aún no tienes ningún passkey' : 'Falta un dispositivo para activarlo'}</div>
          <p className="text-white/65 mt-1">
            {active
              ? 'La administración solo se abre entrando con huella, cara o PIN del dispositivo. Una contraseña robada ya no sirve.'
              : `Registra ${PASSKEYS_REQUIRED} dispositivos (por ejemplo tu móvil y tu portátil). Cuando tengas ${PASSKEYS_REQUIRED}, la contraseña dejará de abrir la administración. Con dos, perder uno no te deja fuera.`}
          </p>
        </div>
      </div>

      {rows === null ? (
        <div className="pn-skeleton h-16" />
      ) : rows.length > 0 && (
        <ul className="divide-y divide-white/10 -my-2">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center gap-3 py-3">
              <span className="w-9 h-9 rounded-xl bg-[var(--signal)]/10 text-[var(--signal)] border border-[var(--portal-line-strong)] flex items-center justify-center shrink-0"><Smartphone className="w-4 h-4" /></span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{r.name}</div>
                <div className="text-xs text-white/45">Añadido {timeAgo(r.created_at)} · {r.last_used_at ? `usado ${timeAgo(r.last_used_at)}` : 'sin usar todavía'}{r.backed_up ? ' · copia en tu cuenta' : ''}</div>
              </div>
              <button onClick={() => remove(r)} aria-label={`Quitar ${r.name}`} className="w-9 h-9 rounded-xl text-white/40 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center cursor-pointer"><Trash2 className="w-4 h-4" /></button>
            </li>
          ))}
        </ul>
      )}

      {!supported ? (
        <p className="text-sm text-yellow-400">Este navegador no admite passkeys. Prueba con Chrome, Safari, Edge o Firefox actualizados.</p>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Nombre del dispositivo (ej. iPhone de Miguel)" aria-label="Nombre del dispositivo" className="flex-1 rounded-full border px-4 py-2.5 text-sm outline-none" />
          <button onClick={add} disabled={busy} className="inline-flex items-center justify-center gap-2 px-5 h-11 rounded-full portal-cta text-sm cursor-pointer disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />} Añadir este dispositivo
          </button>
        </div>
      )}
      <p className="text-xs text-white/45">Para registrar tu móvil desde el ordenador, pulsa el botón: el navegador mostrará un QR. Escanéalo con el móvil y confirma con tu huella.</p>
      {msg && <p role="status" className={cn('text-sm', msg.ok ? 'text-green-400' : 'text-red-400')}>{msg.text}</p>}
    </div>
  );
}
