'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import { Loader2 } from 'lucide-react';
import AuthShell from '@/components/studio/AuthShell';

interface InviteInfo {
  id: string;
  email: string;
  role: string;
  inviterName: string;
}

function AcceptTeamInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const token = searchParams?.get('token') ?? '';

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Validate token on load
  useEffect(() => {
    if (!token) {
      setFetchError('Invalid or missing invite link.');
      return;
    }
    fetch(`/api/team/accept?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setFetchError(data.error);
        else setInvite(data);
      })
      .catch(() => setFetchError('Failed to load invitation.'));
  }, [token]);

  const handleAccept = async () => {
    if (!session?.access_token) {
      // Save invite URL so the user can return after signing in
      if (typeof window !== 'undefined') {
        localStorage.setItem('pending_invite', JSON.stringify({
          url: `/invite/accept-team?token=${token}`,
          expires: Date.now() + 30 * 60 * 1000,
        }));
      }
      router.push('/auth?invite=1');
      return;
    }
    setAccepting(true);
    setAcceptError(null);
    try {
      const res = await fetch('/api/team/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAcceptError(data.error || 'Failed to accept invitation.');
        return;
      }
      setDone(true);
      setTimeout(() => router.push(data.redirectTo || '/portal'), 1500);
    } catch {
      setAcceptError('Something went wrong. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  if (authLoading || (!invite && !fetchError)) {
    return (
      <div className="home-root flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--signal)]" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <AuthShell title="Esa invitación no *vale.*" kicker="/ Invitación">
        <p role="alert" className="text-[#b42318] text-sm">{fetchError}</p>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell title="Ya eres *del equipo.*" kicker="/ Invitación">
        <div className="text-center">
          <p className="text-[var(--signal)] font-semibold">You've joined the team!</p>
          <p className="text-white/50 text-sm mt-1">Redirecting to portal…</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Te han *invitado.*" kicker="/ Invitación de equipo">
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">Team invitation</h2>
        <p className="text-white/60 text-sm mb-6">
          <span className="text-white font-medium">{invite?.inviterName}</span> has invited you to join their team as{' '}
          <span className="text-white font-medium capitalize">{invite?.role}</span>.
        </p>

        {!session && (
          <p className="text-yellow-400 text-xs mb-4">
            You&apos;ll be asked to sign in or create an account before accepting.
          </p>
        )}

        {acceptError && (
          <p className="text-red-400 text-sm mb-4">{acceptError}</p>
        )}

        <button
          onClick={handleAccept}
          disabled={accepting}
          className="btn-minimal-filled w-full py-3 rounded-lg font-semibold disabled:opacity-50 transition-colors flex items-center justify-center"
        >
          {accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Accept invitation'}
        </button>
      </div>
    </AuthShell>
  );
}

export default function AcceptTeamInvitePage() {
  return (
    <Suspense fallback={
      <div className="home-root flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--signal)]" />
      </div>
    }>
      <AcceptTeamInviteContent />
    </Suspense>
  );
}
