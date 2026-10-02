import type { VideoStatus } from '@/lib/videos';

export interface StudioAvatar {
  id: string;
  name: string;
  style: string;
  gender: string;
  tags: string[];
  image_url: string;
  preview_url: string | null;
}

export interface StudioRequest {
  id: string;
  avatar_id: string | null;
  avatar_name: string;
  avatar_image_url: string | null;
  script_notes: string;
  est_seconds: number;
  product: string | null;
  tone: string | null;
  cta: string | null;
  drive_url: string | null;
  status: VideoStatus;
  script_text: string | null;
  client_feedback: string | null;
  delivery_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudioData {
  balance: number;
  granted: number;
  requests: StudioRequest[];
  avatars: StudioAvatar[];
  unavailable?: boolean;
}

export interface ClientCall {
  id: string;
  kind: 'call' | 'proposal';
  call_at: string | null;
  status: 'new' | 'contacted' | 'won' | 'lost';
  created_at: string;
}

export interface ClientNotice {
  lead_id: string;
  id: string;
  title: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

export interface ClientPurchase {
  id: string;
  pack_name: string;
  items: { name: string; qty: number; total_eur: number }[];
  amount_eur: number;
  monthly: boolean;
  paid_at: string | null;
  invoice_url: string | null;
}

/** Datos con los que la agencia previsualiza el panel de un cliente (sin llamar a la API del cliente). */
export interface ClientPreviewData {
  name: string;
  email: string;
  sample: boolean;
  studio: StudioData;
  notices: ClientNotice[];
  purchases: ClientPurchase[];
  calls: ClientCall[];
}

export interface VideoDraft {
  avatarId: string;
  scriptNotes: string;
  product: string;
  tone: string;
  cta: string;
  driveUrl: string;
}

export const EMPTY_DRAFT: VideoDraft = { avatarId: '', scriptNotes: '', product: '', tone: '', cta: '', driveUrl: '' };

export type ClientPage = 'inicio' | 'videos' | 'avatares' | 'avisos' | 'compras' | 'llamadas' | 'ayuda' | 'ajustes';

export const CLIENT_PAGES: ClientPage[] = ['inicio', 'videos', 'avatares', 'avisos', 'compras', 'llamadas', 'ayuda', 'ajustes'];

export const isClientPage = (v: string | undefined): v is ClientPage => !!v && (CLIENT_PAGES as string[]).includes(v);
