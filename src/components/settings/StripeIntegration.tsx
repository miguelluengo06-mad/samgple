'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';
import { supabase } from '@/lib/supabase';
import { CreditCard, Eye, EyeOff, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';

export function StripeIntegration() {
  const { user, session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const webhookUrl = typeof window === 'undefined' ? '/api/webhooks/pack-payments' : `${window.location.origin}/api/webhooks/pack-payments`;
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      loadStripeStatus();
    }
  }, [user]);

  const loadStripeStatus = async () => {
    if (!user || !session) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('agency_stripe_key_set')
        .eq('id', user.id)
        .single();

      if (profile?.agency_stripe_key_set) {
        setHasKey(true);
        setIsConnected(true);
      }
    } catch (error) {
      console.error('Error loading stripe status:', error);
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim() || !session) return;

    // Basic validation
    if (!apiKey.startsWith('sk_live_') && !apiKey.startsWith('sk_test_')) {
      setMessage({ type: 'error', text: 'Escribe una clave secreta de Stripe válida (empieza por sk_live_ o sk_test_)' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/agency/stripe-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ apiKey }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo guardar la clave');
      }

      setHasKey(true);
      setIsConnected(true);
      setApiKey('');
      setMessage({ type: 'success', text: 'Clave de Stripe guardada. Ya puedes cobrar tus packs.' });
    } catch (error: any) {
      console.error('Error saving API key:', error);
      setMessage({ type: 'error', text: error.message || 'No se pudo guardar la clave' });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveApiKey = async () => {
    if (!session) return;

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/agency/stripe-key', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo desconectar Stripe');
      }

      setHasKey(false);
      setIsConnected(false);
      setMessage({ type: 'success', text: 'Stripe desconectado' });
    } catch (error: any) {
      console.error('Error removing API key:', error);
      setMessage({ type: 'error', text: error.message || 'No se pudo desconectar Stripe' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900/50 rounded-lg border border-gray-800 p-6">
      <div className="flex items-center gap-2 mb-4">
        <CreditCard className="h-5 w-5 text-gray-400" />
        <h3 className="text-lg font-medium text-white">Cobros con Stripe</h3>
      </div>

      <p className="text-white/60 text-sm mb-4">
        Conecta tu cuenta de Stripe para cobrar los packs de la web y la landing. El cliente paga en una pantalla segura de Stripe, recibe su factura y la compra aparece sola en Solicitudes.
        Los precios se cobran tal cual se ven en la web: con el IVA incluido.
      </p>

      {message && (
        <div className={`mb-4 p-3 rounded-lg ${
          message.type === 'success'
            ? 'bg-olive-900/20 border border-olive-800 text-olive-400'
            : 'bg-red-900/20 border border-red-800 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        {/* Connection Status */}
        <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isConnected ? (
                <>
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <span className="text-white font-medium">Conectado</span>
                </>
              ) : (
                <>
                  <div className="w-3 h-3 bg-gray-500 rounded-full" />
                  <span className="text-white/60">Sin conectar</span>
                </>
              )}
            </div>
            {isConnected && (
              <button
                onClick={handleRemoveApiKey}
                disabled={loading}
                className="text-sm text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
              >
                {loading ? 'Desconectando…' : 'Desconectar'}
              </button>
            )}
          </div>
        </div>

        {/* API Key Input */}
        {!isConnected && (
          <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-4 space-y-4">
            <div>
              <label className="block text-sm text-white/60 mb-2">
                Clave secreta de Stripe
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk_live_..."
                  className="w-full px-4 py-3 card-liquid rounded-lg text-white placeholder:text-gray-500 focus:ring-2 focus:ring-olive-500 focus:border-olive-500 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="mt-2 text-xs text-white/40">
                La encuentras en{' '}
                <a
                  href="https://dashboard.stripe.com/apikeys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 hover:text-white underline inline-flex items-center gap-1"
                >
                  Stripe → Desarrolladores → Claves API <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            </div>

            <button
              onClick={handleSaveApiKey}
              disabled={saving || !apiKey.trim()}
              className="w-full px-4 py-3 bg-olive-500 text-black hover:bg-olive-400 disabled:bg-gray-400 disabled:text-gray-600 rounded-full text-sm font-medium transition-colors"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Conectando…
                </span>
              ) : (
                'Conectar Stripe'
              )}
            </button>
          </div>
        )}

        {/* Cómo dejarlo listo */}
        <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-white/40 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-white/60 min-w-0">
              <p className="mb-2">Para empezar a cobrar:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Pega arriba tu clave secreta (empieza por <code className="text-white/80">sk_test_</code> para probar, <code className="text-white/80">sk_live_</code> para cobrar de verdad).</li>
                <li>
                  En Stripe → Desarrolladores → Webhooks, añade este endpoint con el evento{' '}
                  <code className="text-white/80">checkout.session.completed</code> (y <code className="text-white/80">checkout.session.async_payment_succeeded</code>):
                  <code className="block mt-1.5 px-3 py-2 rounded-lg bg-black/30 text-white/80 break-all select-all">{webhookUrl}</code>
                </li>
                <li>Copia el «secreto de firma» del webhook (<code className="text-white/80">whsec_…</code>) en la variable <code className="text-white/80">STRIPE_PACKS_WEBHOOK_SECRET</code> del servidor.</li>
                <li>Prueba una compra con la tarjeta <code className="text-white/80">4242 4242 4242 4242</code> antes de pasar a claves reales.</li>
              </ol>
              <p className="mt-2 text-white/40">
                Tu clave se guarda cifrada y solo se usa en el servidor. Tienes la guía completa en <code>docs/STRIPE_PACKS.md</code>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
