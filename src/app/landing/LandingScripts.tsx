'use client';

import { useEffect } from 'react';
import { startPackCheckout } from '@/components/home/BuyPack';

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

const ATTRIBUTION_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'];
const ATTRIBUTION_STORAGE = 'lp_attribution';

/**
 * Ad attribution: first-touch utm_* / fbclid from the landing URL, kept in sessionStorage so it survives
 * in-page navigation and reloads. Returns null for organic visits.
 */
function readAttribution(): Record<string, string> | null {
  const found: Record<string, string> = {};
  try {
    const params = new URLSearchParams(window.location.search);
    for (const key of ATTRIBUTION_KEYS) {
      const value = params.get(key);
      if (value) found[key] = value.slice(0, 200);
    }
    if (Object.keys(found).length > 0) {
      sessionStorage.setItem(ATTRIBUTION_STORAGE, JSON.stringify(found));
      return found;
    }
    const stored = sessionStorage.getItem(ATTRIBUTION_STORAGE);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return Object.keys(found).length > 0 ? found : null;
  }
}

/** POSTs a lead to the panel (Solicitudes) through /api/public/contact. Returns the created lead ({ id }). Throws with the server's message. */
async function postLead(body: Record<string, unknown>): Promise<{ id?: string }> {
  const res = await fetch('/api/public/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: 'landing', kind: 'proposal', utm: readAttribution(), ...body }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'No se pudo enviar');
  }
  return res.json().catch(() => ({}));
}

const isValidPhone = (value: string) => {
  const digits = value.replace(/\D/g, '');
  return /^[+\d][\d\s().-]*$/.test(value) && digits.length >= 8 && digits.length <= 15;
};

interface FormConfig {
  form: HTMLFormElement;
  success: HTMLElement;
  /** field name → returns an error message, or '' when the value is fine. Order = order of checking/focus. */
  rules: Record<string, (value: string) => string>;
  /**
   * Sends the validated data. Throw to show the message under the error field.
   * Return { redirectTo } to send the visitor somewhere else (Stripe) instead of showing the success panel.
   */
  send: (data: FormData) => Promise<void | { redirectTo: string }>;
  /** Runs once the lead is delivered (fill the success panel…). */
  onSuccess?: (data: FormData) => void;
  /** Field that receives server-side errors */
  errorField: string;
}

/**
 * Shared behaviour for the landing's forms: validate → show inline errors (aria-invalid + live region) →
 * send → Meta Pixel "Lead" event → swap the form for its success panel.
 * Each field's error text goes in the element with data-error-for="<field name>".
 */
function bindLeadForm(cfg: FormConfig): () => void {
  const { form, success, rules, send, onSuccess, errorField } = cfg;
  const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');

  const controls = (name: string) => Array.from(form.querySelectorAll<HTMLInputElement>(`[name="${name}"]`));

  const setError = (name: string, message: string) => {
    const out = form.querySelector<HTMLElement>(`[data-error-for="${name}"]`);
    if (out) out.textContent = message;
    controls(name).forEach((c) => c.setAttribute('aria-invalid', message ? 'true' : 'false'));
  };

  const validate = (): string | null => {
    const data = new FormData(form);
    let firstInvalid: string | null = null;
    for (const [name, rule] of Object.entries(rules)) {
      const message = rule(String(data.get(name) ?? ''));
      setError(name, message);
      if (message && !firstInvalid) firstInvalid = name;
    }
    return firstInvalid;
  };

  // Clear a field's error as soon as the person fixes it
  const onInput = (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (target?.name && rules[target.name] && target.getAttribute('aria-invalid') === 'true') {
      setError(target.name, rules[target.name](String(new FormData(form).get(target.name) ?? '')));
    }
  };
  form.addEventListener('input', onInput);

  const onSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    const invalid = validate();
    if (invalid) {
      controls(invalid)[0]?.focus();
      return;
    }

    const data = new FormData(form);
    if (submitBtn) submitBtn.disabled = true;
    let outcome: void | { redirectTo: string };
    try {
      outcome = await send(data);
    } catch (err) {
      if (submitBtn) submitBtn.disabled = false;
      const detail = err instanceof Error && err.message ? err.message : '';
      setError(errorField, detail || 'No hemos podido enviar tus datos. Inténtalo de nuevo en un momento.');
      controls(errorField)[0]?.focus();
      return;
    }

    // Meta Pixel: only fires if the pixel snippet has been added to the page
    if (typeof window.fbq === 'function') window.fbq('track', 'Lead');

    if (outcome && outcome.redirectTo) {
      // On to Stripe: keep the form as it is, with the button busy, until the browser navigates away
      if (submitBtn) {
        submitBtn.dataset.label = submitBtn.textContent || '';
        submitBtn.textContent = 'Abriendo el pago seguro…';
      }
      window.location.assign(outcome.redirectTo);
      return;
    }

    onSuccess?.(data);
    form.hidden = true;
    success.hidden = false;
    success.focus();
  };
  form.addEventListener('submit', onSubmit);

  // Back button from Stripe restores this page from cache with the button still busy
  const onPageShow = (e: PageTransitionEvent) => {
    if (!e.persisted || !submitBtn) return;
    submitBtn.disabled = false;
    if (submitBtn.dataset.label) submitBtn.textContent = submitBtn.dataset.label;
  };
  window.addEventListener('pageshow', onPageShow);

  return () => {
    form.removeEventListener('input', onInput);
    form.removeEventListener('submit', onSubmit);
    window.removeEventListener('pageshow', onPageShow);
  };
}

/**
 * Behaviour for the landing (vanilla DOM on the server-rendered markup — the equivalent of main.js):
 *   1. Scroll reveal   — fade + 12px rise (staggered), skipped with prefers-reduced-motion
 *      Scroll progress bar and header state (solid + smaller once you scroll)
 *   2. Mobile CTA bar  — hidden while a form (#reserva / #empezar) is on screen
 *   3. Example videos  — tap to play the video in data-src
 *      Catalog buttons    — "Quiero este pack" prefills the final form with the chosen pack
 *   4. Forms           — Pack de Bienvenida (#pack-form → saves the lead, then opens Stripe) and the general
 *                        contact form (#lead-form); both delivered to the admin panel with the ad attribution
 */
export default function LandingScripts() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.lp');
    if (!root) return;

    readAttribution(); // remember utm_* / fbclid from the first page view

    const cleanups: Array<() => void> = [];
    const hasIO = 'IntersectionObserver' in window;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* 1 · Scroll reveal ─────────────────────────────────────────────── */
    if (hasIO && !reduceMotion) {
      const io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            entry.target.classList.add('is-visible');
            // after the entrance, hover effects must not inherit its stagger delay
            window.setTimeout(() => entry.target.classList.add('is-done'), 1200);
            io.unobserve(entry.target);
          }
        },
        { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
      );
      root.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
        // Already on screen at load → leave it alone (no flash of hidden content)
        if (el.classList.contains('is-visible') || el.getBoundingClientRect().top < window.innerHeight) return;
        el.classList.add('is-hidden');
        io.observe(el);
      });
      cleanups.push(() => io.disconnect());
    }

    /* 1b · Scroll progress + header state (rAF-throttled) */
    const header = root.querySelector<HTMLElement>('[data-header]');
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
        root.style.setProperty('--lp-progress', progress.toFixed(4));
        header?.classList.toggle('is-scrolled', window.scrollY > 12);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    cleanups.push(() => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    });

    /* 2 · Mobile CTA bar ────────────────────────────────────────────── */
    const bar = root.querySelector<HTMLElement>('[data-mobile-bar]');
    const formSections = ['#reserva', '#empezar']
      .map((sel) => root.querySelector<HTMLElement>(sel))
      .filter((el): el is HTMLElement => !!el);
    if (bar && formSections.length > 0 && hasIO) {
      const visible = new Set<Element>();
      const barIO = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) visible.add(entry.target);
            else visible.delete(entry.target);
          }
          bar.classList.toggle('is-hidden', visible.size > 0);
        },
        { threshold: 0 }
      );
      formSections.forEach((el) => barIO.observe(el));
      cleanups.push(() => barIO.disconnect());
    }

    /* 3 · Feed-style videos (hero + examples) ──────────────────────────
       Each [data-video-card] plays while at least half of it is on screen and pauses the moment the
       reader scrolls away — no click needed to start it. The only manual control is one mute/unmute
       button per video; [data-try-sound] (the hero) additionally tries once to start with sound the
       first time it comes into view, falling back to muted when the browser blocks it. */
    root.querySelectorAll<HTMLElement>('[data-video-card]').forEach((card) => {
      const video = card.querySelector('video');
      const muteBtn = card.querySelector<HTMLButtonElement>('[data-mute-toggle]');
      if (!video) return;

      const syncMuteButton = () => {
        if (!muteBtn) return;
        muteBtn.classList.toggle('is-muted', video.muted);
        muteBtn.setAttribute('aria-pressed', String(!video.muted));
        muteBtn.setAttribute('aria-label', video.muted ? 'Activar sonido' : 'Silenciar vídeo');
      };

      if (muteBtn) {
        const onMuteToggle = () => {
          video.muted = !video.muted;
          if (!video.muted) video.play().catch(() => {});
          syncMuteButton();
        };
        muteBtn.addEventListener('click', onMuteToggle);
        cleanups.push(() => muteBtn.removeEventListener('click', onMuteToggle));
      }

      let soundTried = false;
      const tryPlay = () => {
        if (card.dataset.trySound === 'true' && !soundTried) {
          soundTried = true;
          video.muted = false;
          video
            .play()
            .catch(() => {
              video.muted = true;
              return video.play().catch(() => {});
            })
            .then(syncMuteButton);
        } else {
          video.play().catch(() => {});
        }
      };

      if (hasIO) {
        const cardIO = new IntersectionObserver(
          ([entry]) => (entry.isIntersecting ? tryPlay() : video.pause()),
          { threshold: 0.5 }
        );
        cardIO.observe(card);
        cleanups.push(() => cardIO.disconnect());
      } else {
        tryPlay(); // no IntersectionObserver support: just play it
      }
    });

    /* 3b · Catalog buttons ("Quiero este pack") → prefill "¿Qué te interesa?" in the final form.
       Delegated: the catalog is a React component whose cards re-render when the filters change. */
    const onPackChoice = (event: Event) => {
      const link = (event.target as HTMLElement).closest<HTMLElement>('[data-pack-choice]');
      if (!link) return;
      const interest = root.querySelector<HTMLInputElement>('#lead-interest');
      if (interest) interest.value = `Pack elegido: ${link.dataset.packChoice}`.slice(0, 200);
      // the anchor smooth-scrolls to #empezar; put the cursor in the first empty field once it arrives
      window.setTimeout(() => root.querySelector<HTMLInputElement>('#lead-name')?.focus({ preventScroll: true }), 700);
    };
    root.addEventListener('click', onPackChoice);
    cleanups.push(() => root.removeEventListener('click', onPackChoice));

    /* 4 · Forms ─────────────────────────────────────────────────────── */

    // Pack de Bienvenida: empresa, web/tienda, producto, ¿anuncios? (+ WhatsApp to reach them)
    const packForm = root.querySelector<HTMLFormElement>('#pack-form');
    const packSuccess = root.querySelector<HTMLElement>('[data-pack-success]');
    if (packForm && packSuccess) {
      let packLeadId: string | undefined;
      let checkoutError = '';
      const RETURN_PATH = '/landing#pack';

      // Fallback button: shown only if Stripe could not be opened automatically
      const retryBtn = packSuccess.querySelector<HTMLButtonElement>('[data-pay-retry]');
      const payError = packSuccess.querySelector<HTMLElement>('[data-pay-error]');
      const onRetry = async () => {
        if (!retryBtn) return;
        retryBtn.disabled = true;
        if (payError) payError.textContent = '';
        try {
          window.location.assign(await startPackCheckout('bienvenida', { leadId: packLeadId, returnPath: RETURN_PATH }));
        } catch (err) {
          retryBtn.disabled = false;
          if (payError) payError.textContent = err instanceof Error ? err.message : 'No hemos podido abrir el pago.';
        }
      };
      retryBtn?.addEventListener('click', onRetry);
      cleanups.push(() => retryBtn?.removeEventListener('click', onRetry));

      cleanups.push(
        bindLeadForm({
          form: packForm,
          success: packSuccess,
          errorField: 'phone',
          rules: {
            company: (v) => (v.trim().length < 2 ? 'Escribe el nombre de tu empresa.' : ''),
            website: (v) => (v.trim().length < 3 ? 'Escribe la web o el enlace de tu tienda.' : ''),
            product: (v) => (v.trim().length < 2 ? 'Cuéntanos qué producto quieres promocionar.' : ''),
            ads: (v) => (v === 'Sí' || v === 'No' ? '' : 'Elige una opción.'),
            phone: (v) => (isValidPhone(v.trim()) ? '' : 'Escribe un WhatsApp válido, por ejemplo +34 600 000 000.'),
          },
          send: async (data) => {
            const lead = await postLead({
              pack: 'welcome',
              name: String(data.get('company') || '').trim(), // the empresa is the lead's name in the panel
              company: String(data.get('company') || '').trim(),
              phone: String(data.get('phone') || '').trim(),
              website: String(data.get('hp') || ''), // honeypot
              packData: {
                website: String(data.get('website') || '').trim(),
                product: String(data.get('product') || '').trim(),
                runsAds: String(data.get('ads') || ''),
              },
            });
            packLeadId = lead.id;
            // The lead is saved: straight on to the secure Stripe payment page
            try {
              checkoutError = '';
              return { redirectTo: await startPackCheckout('bienvenida', { leadId: lead.id, returnPath: RETURN_PATH }) };
            } catch (err) {
              // Payments not active yet (or Stripe hiccup): the lead is safe, show the fallback panel
              checkoutError = err instanceof Error ? err.message : 'No hemos podido abrir el pago.';
            }
          },
          onSuccess: (data) => {
            const slot = packSuccess.querySelector<HTMLElement>('[data-pack-name]');
            if (slot) slot.textContent = String(data.get('company') || '').trim() || 'tu empresa';
            if (payError) payError.textContent = checkoutError;
          },
        })
      );
    }

    // General contact form (final CTA)
    const leadForm = root.querySelector<HTMLFormElement>('#lead-form');
    const leadSuccess = root.querySelector<HTMLElement>('[data-success]');
    if (leadForm && leadSuccess) {
      cleanups.push(
        bindLeadForm({
          form: leadForm,
          success: leadSuccess,
          errorField: 'phone',
          rules: {
            name: (v) => (v.trim().length < 2 ? 'Escribe tu nombre.' : ''),
            phone: (v) => (isValidPhone(v.trim()) ? '' : 'Escribe un WhatsApp válido, por ejemplo +34 600 000 000.'),
          },
          send: async (data) => {
            await postLead({
              name: String(data.get('name') || '').trim(),
              phone: String(data.get('phone') || '').trim(),
              company: String(data.get('business') || '').trim(),
              message: String(data.get('interest') || '').trim(),
              website: String(data.get('website') || ''), // honeypot
            });
          },
        })
      );
    }

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return null;
}
