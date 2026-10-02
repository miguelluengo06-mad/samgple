'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { loginWithPasskey, passkeysSupported } from '@/lib/passkeyClient';

interface AuthConfig {
  allow_signup: boolean;
}

interface AuthProps {
  onSuccess?: () => void;
  initialMode?: 'signin' | 'signup';
  redirectTo?: string;
  lockedEmail?: string; // Pre-filled and read-only email (for invites)
  authConfig?: AuthConfig;
}

const INFO_PREFIX = 'Revisa tu email';

/** Supabase returns English messages — translate the ones people actually hit. */
function friendlyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Email o contraseña incorrectos';
  if (m.includes('email not confirmed')) return 'Aún no has confirmado tu email. Revisa tu bandeja de entrada.';
  if (m.includes('user already registered')) return 'Ya existe una cuenta con este email. Prueba a acceder.';
  if (m.includes('password should be at least')) return 'La contraseña debe tener al menos 6 caracteres';
  if (m.includes('rate limit') || m.includes('too many')) return 'Demasiados intentos. Espera un momento y vuelve a probar.';
  if (m.includes('signups not allowed') || m.includes('signup is disabled')) return 'El registro está cerrado por ahora.';
  if (m.includes('unable to validate email') || m.includes('invalid email')) return 'Introduce un email válido';
  return message;
}

export default function Auth({ onSuccess, initialMode = 'signin', redirectTo, lockedEmail, authConfig }: AuthProps) {
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(lockedEmail || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>(initialMode);
  const [resetLoading, setResetLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [canPasskey, setCanPasskey] = useState(false);
  useEffect(() => setCanPasskey(passkeysSupported()), []);
  const isInfo = !!error && error.startsWith(INFO_PREFIX);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'signup') {
        if (password !== confirmPassword) {
          setError('Las contraseñas no coinciden');
          setLoading(false);
          return;
        }
        // Derive site URL from browser origin to avoid hardcoded localhost in production
        const siteUrl =
          typeof window !== 'undefined'
            ? window.location.origin
            : process.env.NEXT_PUBLIC_SITE_URL || '';

        const callbackUrl = redirectTo
          ? `${siteUrl}/auth/callback?next=${encodeURIComponent(redirectTo)}`
          : `${siteUrl}/auth/callback`;

        console.log('🔐 Sign-up using redirect URL:', callbackUrl);

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: callbackUrl,
            // handle_new_user() copies full_name into profiles
            data: fullName.trim() ? { full_name: fullName.trim() } : undefined,
          },
        });
        if (error) throw error;

        // Show success message for sign up
        setError(`${INFO_PREFIX}: te hemos enviado un enlace para confirmar tu cuenta.`);
      } else {
        // El acceso pasa por el servidor para poder contar los fallos y bloquear a quien intente adivinar claves
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        if (res.status === 403) throw new Error('Acceso denegado desde este dispositivo.');
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Email o contraseña incorrectos');
        const { error } = await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
        if (error) throw error;

        // After successful sign in, redirect if redirectTo is provided, otherwise call onSuccess
        if (redirectTo) {
          // Don't set loading to false - let the redirect happen with button still loading
          window.location.href = redirectTo;
          return;
        } else {
          onSuccess?.();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? friendlyError(err.message) : 'Ha ocurrido un error');
    } finally {
      setLoading(false);
    }
  };

  const handlePasskey = async () => {
    setPasskeyLoading(true);
    setError(null);
    try {
      const tokens = await loginWithPasskey();
      const { error } = await supabase.auth.setSession(tokens);
      if (error) throw error;
      if (redirectTo) {
        window.location.href = redirectTo;
        return;
      }
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? friendlyError(err.message) : 'No se pudo entrar con passkey.');
    } finally {
      setPasskeyLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setError(null);

    try {
      const baseUrl = typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_SITE_URL || '';

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${baseUrl}/auth/callback?reset=true`,
      });

      if (error) throw error;

      setError(`${INFO_PREFIX}: te hemos enviado el enlace para restablecer tu contraseña.`);
    } catch (err) {
      setError(err instanceof Error ? friendlyError(err.message) : 'Ha ocurrido un error');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className='w-full max-w-md space-y-8'>
      <div>
        <h2 className='mt-6 text-center text-3xl font-bold tracking-tight text-white'>
          {mode === 'reset' ? 'Restablece tu contraseña' : mode === 'signin' ? 'Accede a tu cuenta' : 'Crea tu cuenta'}
        </h2>
        {mode === 'reset' && (
          <p className='mt-2 text-center text-sm text-white/60'>
            Introduce tu email y te enviaremos un enlace para restablecerla
          </p>
        )}
      </div>

      <div className='mt-8 space-y-6'>
        {/* Password Reset Form */}
        {mode === 'reset' ? (
        <form className='space-y-4' onSubmit={handlePasswordReset}>
          <div>
            <label htmlFor='email' className='block text-sm font-medium text-white/80 mb-1'>
              Email
            </label>
            <input
              id='email'
              name='email'
              type='email'
              autoComplete='email'
              required
              className='block w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/40 focus:border-olive-500/40 focus:outline-none focus:ring-1 focus:ring-olive-500/20 sm:text-sm backdrop-blur-sm'
              placeholder='tu@empresa.com'
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          {error && (
            <div
              className={`rounded-lg p-4 border backdrop-blur-sm ${
                isInfo
                  ? 'bg-olive-500/10 border-green-500/30 text-olive-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}
            >
              <div className='flex'>
                <div className='flex-shrink-0'>
                  {isInfo ? (
                    <svg className='h-5 w-5 text-olive-400' fill='currentColor' viewBox='0 0 20 20'>
                      <path
                        fillRule='evenodd'
                        d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                        clipRule='evenodd'
                      />
                    </svg>
                  ) : (
                    <svg className='h-5 w-5 text-red-400' fill='currentColor' viewBox='0 0 20 20'>
                      <path
                        fillRule='evenodd'
                        d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z'
                        clipRule='evenodd'
                      />
                    </svg>
                  )}
                </div>
                <div className='ml-3'>
                  <p className='text-sm font-medium'>{error}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type='submit'
              disabled={resetLoading}
              className='btn-minimal-filled group relative flex w-full justify-center rounded-lg py-3 px-4 text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {resetLoading ? (
                <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-white'></div>
              ) : (
                <>
                  Enviar enlace
                  <svg
                    className='ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M13 7l5 5m0 0l-5 5m5-5H6'
                    />
                  </svg>
                </>
              )}
            </button>
          </div>

          <div className='text-center'>
            <button
              type='button'
              onClick={() => setMode('signin')}
              className='text-sm text-white/60 hover:text-white font-medium transition-colors cursor-pointer'
            >
              Volver a acceder
            </button>
          </div>
        </form>
        ) : (
        /* Email/Password Form */
        <form className='space-y-4' onSubmit={handleAuth}>
          <div className='space-y-4'>
            {mode === 'signup' && !lockedEmail && (
              <div>
                <label htmlFor='fullName' className='block text-sm font-medium text-white/80 mb-1'>
                  Nombre <span className='text-white/40 font-normal'>(opcional)</span>
                </label>
                <input
                  id='fullName'
                  name='fullName'
                  type='text'
                  autoComplete='name'
                  maxLength={120}
                  className='block w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/40 focus:border-olive-500/40 focus:outline-none focus:ring-1 focus:ring-olive-500/20 sm:text-sm backdrop-blur-sm'
                  placeholder='Tu nombre'
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                />
              </div>
            )}
            <div>
              <label htmlFor='email' className='block text-sm font-medium text-white/80 mb-1'>
                Email
              </label>
              <input
                id='email'
                name='email'
                type='email'
                autoComplete='email'
                required
                readOnly={!!lockedEmail}
                className={`block w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/40 focus:border-olive-500/40 focus:outline-none focus:ring-1 focus:ring-olive-500/20 sm:text-sm backdrop-blur-sm ${lockedEmail ? 'cursor-not-allowed opacity-70' : ''}`}
                placeholder='tu@empresa.com'
                value={email}
                onChange={e => !lockedEmail && setEmail(e.target.value)}
              />
              {lockedEmail && (
                <p className='mt-1 text-xs text-white/50'>Este email viene de tu invitación</p>
              )}
            </div>
            <div>
              <div className='flex items-center justify-between mb-1'>
                <label htmlFor='password' className='block text-sm font-medium text-white/80'>
                  Contraseña
                </label>
                {mode === 'signin' && (
                  <button
                    type='button'
                    onClick={() => setMode('reset')}
                    className='text-xs text-white/60 hover:text-white transition-colors cursor-pointer py-2'
                  >
                    ¿Has olvidado la contraseña?
                  </button>
                )}
              </div>
              <input
                id='password'
                name='password'
                type='password'
                required
                minLength={6}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                className='block w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/40 focus:border-olive-500/40 focus:outline-none focus:ring-1 focus:ring-olive-500/20 sm:text-sm backdrop-blur-sm'
                placeholder='Tu contraseña'
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            {mode === 'signup' && (
            <div>
              <label htmlFor='confirmPassword' className='block text-sm font-medium text-white/80 mb-1'>
                Repite la contraseña
              </label>
              <input
                id='confirmPassword'
                name='confirmPassword'
                type='password'
                required
                minLength={6}
                autoComplete='new-password'
                className='block w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/40 focus:border-olive-500/40 focus:outline-none focus:ring-1 focus:ring-olive-500/20 sm:text-sm backdrop-blur-sm'
                placeholder='Repite tu contraseña'
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
            </div>
            )}
          </div>

          {error && (
            <div
              className={`rounded-lg p-4 border backdrop-blur-sm ${
                isInfo
                  ? 'bg-olive-500/10 border-green-500/30 text-olive-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}
            >
              <div className='flex'>
                <div className='flex-shrink-0'>
                  {isInfo ? (
                    <svg className='h-5 w-5 text-olive-400' fill='currentColor' viewBox='0 0 20 20'>
                      <path
                        fillRule='evenodd'
                        d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                        clipRule='evenodd'
                      />
                    </svg>
                  ) : (
                    <svg className='h-5 w-5 text-red-400' fill='currentColor' viewBox='0 0 20 20'>
                      <path
                        fillRule='evenodd'
                        d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z'
                        clipRule='evenodd'
                      />
                    </svg>
                  )}
                </div>
                <div className='ml-3'>
                  <p className='text-sm font-medium'>{error}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type='submit'
              disabled={loading}
              className='btn-minimal-filled group relative flex w-full justify-center rounded-lg py-3 px-4 text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {loading ? (
                <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-white'></div>
              ) : (
                <>
                  {mode === 'signin' ? 'Acceder' : 'Crear cuenta'}
                  <svg
                    className='ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M13 7l5 5m0 0l-5 5m5-5H6'
                    />
                  </svg>
                </>
              )}
            </button>
          </div>

          {mode === 'signin' && !lockedEmail && canPasskey && (
            <div className='pt-1'>
              <div className='relative my-1'>
                <div className='absolute inset-0 flex items-center'><div className='w-full border-t border-white/15' /></div>
                <div className='relative flex justify-center text-xs'><span className='bg-black px-2 text-white/50'>Equipo de la agencia</span></div>
              </div>
              <button
                type='button'
                onClick={handlePasskey}
                disabled={passkeyLoading || loading}
                className='mt-3 btn-minimal flex w-full items-center justify-center gap-2 rounded-lg py-3 px-4 text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {passkeyLoading ? (
                  <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-white'></div>
                ) : (
                  <>
                    <svg className='h-5 w-5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'><path d='M12 11c0-1.1.9-2 2-2s2 .9 2 2v3' /><path d='M8 14v-3a4 4 0 0 1 8 0' /><path d='M6 15c0 3 1 5 2 6' /><path d='M12 14c0 3 .5 5.500 1.500 7.500' /><path d='M18 13c0 3-.5 5-1.500 7' /><path d='M4 12a8 8 0 0 1 16 0' /></svg>
                    Entrar con huella o passkey
                  </>
                )}
              </button>
              <p className='mt-2 text-center text-xs text-white/40'>En el ordenador, el navegador te mostrará un QR para escanearlo con tu móvil.</p>
            </div>
          )}

          {mode === 'signup' && (
            <p className='text-center text-xs text-white/40'>
              Al crear la cuenta aceptas que usemos tu email para gestionar tus llamadas y proyectos con nosotros. Consulta los{' '}
              <a href='/terminos' target='_blank' rel='noopener noreferrer' className='underline hover:text-white'>términos</a> y la{' '}
              <a href='/privacidad' target='_blank' rel='noopener noreferrer' className='underline hover:text-white'>política de privacidad</a>.
            </p>
          )}

          {/* Sign up toggle - only shown when allow_signup is enabled */}
          {authConfig?.allow_signup && (
          <div className='text-center'>
            <button
              type='button'
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
              className='text-sm text-white/60 hover:text-white font-medium transition-colors cursor-pointer'
            >
              {mode === 'signin'
                ? '¿No tienes cuenta? Regístrate'
                : '¿Ya tienes cuenta? Accede'}
            </button>
          </div>
          )}
        </form>
        )}
      </div>
    </div>
  );
}
