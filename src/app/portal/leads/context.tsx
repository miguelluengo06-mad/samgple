'use client';

import { createContext, useContext } from 'react';

export interface LeadAnswers {
  needs?: string[];
  budget?: string;
  timeline?: string;
  /** Pack de Bienvenida form (landing): what the customer wants to promote */
  pack?: { id: string; website: string; product: string; runs_ads: string };
  /** Ad attribution captured by the landing (utm_source, utm_campaign, fbclid…) */
  utm?: Record<string, string>;
  /** Compra pagada en Stripe (precio con IVA incluido) */
  order?: {
    session_id: string;
    pack_id: string;
    pack_name: string;
    amount_eur: number;
    currency: string;
    mode: string;
    paid_at: string;
    livemode: boolean;
    customer_id?: string | null;
    subscription_id?: string | null;
    payment_intent_id?: string | null;
    invoice_id?: string | null;
  };
}

export interface Lead {
  id: string;
  name: string;
  /** Empty for landing leads (WhatsApp-first form) */
  email: string;
  company: string | null;
  phone: string | null;
  message: string;
  status: 'new' | 'contacted' | 'won' | 'lost';
  /** 'call' = a booked call (has call_at + answers); 'proposal' = free-text request */
  kind: 'proposal' | 'call';
  call_at: string | null;
  answers: LeadAnswers | null;
  /** 'website' (booking / proposal form) or 'landing' (ads landing) */
  source: string;
  notes: string | null;
  created_at: string;
}

interface LeadsContextValue {
  leads: Lead[];
  loading: boolean;
  refetch: () => Promise<void>;
}

export const LeadsContext = createContext<LeadsContextValue>({
  leads: [],
  loading: true,
  refetch: async () => {},
});

export function useLeadsContext() {
  return useContext(LeadsContext);
}

// ---- derived views shared by the dashboard, calls and requests pages ----

/** Calls that are still on the calendar: booked, not cancelled (lost) and not yet marked as done. */
export function isPendingCall(l: Lead): boolean {
  return l.kind === 'call' && !!l.call_at && l.status === 'new';
}

export function upcomingCalls(leads: Lead[], now: number = Date.now()): Lead[] {
  // Keep a call listed until 30 min after it starts, so "in progress" calls don't vanish.
  return leads
    .filter((l) => isPendingCall(l) && new Date(l.call_at!).getTime() + 30 * 60000 >= now)
    .sort((a, b) => new Date(a.call_at!).getTime() - new Date(b.call_at!).getTime());
}

/** New requests that still need a first reply (calls are tracked on their own page). */
export function newRequests(leads: Lead[]): Lead[] {
  return leads.filter((l) => l.kind !== 'call' && l.status === 'new');
}
