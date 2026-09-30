'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import Auth from '@/components/Auth';
import { supabase } from '@/lib/supabase';
import KineticWordmark from '@/components/home/KineticWordmark';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
const DEMO_EMAIL = process.env.NEXT_PUBLIC_DEMO_EMAIL || '';
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD || '';

/** Read cached agency logo from localStorage (persists after logout). */
function getCachedLogo(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem('flowengine_agency_logo');
    if (cached) {
      const data = JSON.parse(cached);
      if (data?.url) return data.url;
    }
  } catch { /* ignore */ }
  return null;
}

interface AuthConfig {
  allow_signup: boolean;
  enable_google_auth: boolean;
  enable_linkedin_auth: boolean;
  enable_github_auth: boolean;
  agency_name: string | null;
  first_run: boolean;
}

export default function AuthPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  // /auth?mode=signup — the "Registrarse" links on the public site land here
  const signupRequested = searchParams?.get('mode') === 'signup';
  const [demoLoading, setDemoLoading] = useState(false);
  const [isInviteFlow, setIsInviteFlow] = useState(false);

  const enterDemo = async () => {
    if (!DEMO_EMAIL || !DEMO_PASSWORD) return;
    setDemoLoading(true);
    await supabase.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
    setDemoLoading(false);
  };

  // Auto-login in demo mode
  useEffect(() => {
    if (DEMO_MODE && DEMO_EMAIL && DEMO_PASSWORD && !loading && !user) {
      enterDemo();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);
  const [logoUrl] = useState<string | null>(() => getCachedLogo());
  const [authConfig, setAuthConfig] = useState<AuthConfig | undefined>();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/portal');
    }
  }, [loading, user, router]);

  // Detect invite flow from URL param (set by invite accept pages)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsInviteFlow(new URLSearchParams(window.location.search).get('invite') === '1');
    }
  }, []);

  // Fetch auth config (public endpoint, no auth needed)
  useEffect(() => {
    fetch('/api/auth-config')
      .then(res => res.json())
      .then(setAuthConfig)
      .catch(() => {
        // Default: everything disabled
        setAuthConfig({
          allow_signup: false,
          enable_google_auth: false,
          enable_linkedin_auth: false,
          enable_github_auth: false,
          agency_name: null,
          first_run: false,
        });
      });
  }, []);

  if (loading || !authConfig) {
    return (
      <div className="home-root min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    );
  }

  if (user) return null;

  const signupClosed = signupRequested && !isInviteFlow && !authConfig.allow_signup;

  return (
    <div className="home-root min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <Link
        href="/"
        className="home-slab absolute top-5 left-5 !rounded-full px-4 py-2 text-sm text-white/70 hover:text-white transition-colors"
      >
        ← Volver a la web
      </Link>
      <div className="home-slab w-full max-w-md px-6 sm:px-10 py-10 flex flex-col items-center">
      {/* Agency logo (when set) or the wordmark used on the public site */}
      <div className="mb-8 flex flex-col items-center gap-3">
        {logoUrl && <img src={logoUrl} alt="" className="w-16 h-16 object-contain" />}
        <Link href="/" aria-label="Ir a la web">
          <KineticWordmark name={authConfig?.agency_name || 'samgple'} className="text-2xl" />
        </Link>
      </div>
      {DEMO_MODE && DEMO_EMAIL ? (
        <div className="w-full max-w-sm flex flex-col gap-4">
          <button
            onClick={enterDemo}
            disabled={demoLoading}
            className="w-full py-3 bg-olive-500 text-black font-semibold rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            {demoLoading ? 'Entrando...' : 'Entrar a la demo'}
          </button>
          <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60 space-y-1">
            <p className="text-white/30 text-xs uppercase tracking-wide mb-2">Demo credentials</p>
            <p>Email: <span className="text-white/80 font-mono">{DEMO_EMAIL}</span></p>
            <p>Password: <span className="text-white/80 font-mono">{DEMO_PASSWORD}</span></p>
          </div>
          <p className="text-center text-xs text-white/30">Read-only live demo</p>
        </div>
      ) : signupClosed ? (
        <div className="w-full max-w-md text-center space-y-4">
          <h2 className="text-2xl font-bold text-white">El registro está cerrado</h2>
          <p className="text-sm text-white/60">
            Ahora mismo no se admiten cuentas nuevas. Si ya tienes una, accede; si quieres hablar con nosotros, agenda una llamada desde la web.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/auth"
              className="px-5 py-2.5 rounded-full bg-[var(--signal)] text-black text-sm font-medium hover:bg-[var(--signal-dim)] transition-colors"
            >
              Acceder
            </Link>
            <Link href="/" className="px-5 py-2.5 rounded-full border border-white/15 text-sm text-white/70 hover:text-white transition-colors">
              Volver a la web
            </Link>
          </div>
        </div>
      ) : (
        <>
        {authConfig.first_run && !isInviteFlow && (
          <p className="w-full max-w-md mb-6 rounded-lg border border-[var(--signal)]/30 bg-[var(--signal)]/[0.06] px-4 py-3 text-sm text-white/70">
            Primera configuración: la cuenta que crees ahora será la <strong className="text-white">administradora</strong> del panel.
          </p>
        )}
        <Auth
          onSuccess={() => router.replace('/portal')}
          initialMode={(authConfig?.first_run || isInviteFlow || signupRequested) ? 'signup' : 'signin'}
          authConfig={isInviteFlow ? { ...authConfig, allow_signup: true } : authConfig}
        />
        </>
      )}
      </div>
    </div>
  );
}
