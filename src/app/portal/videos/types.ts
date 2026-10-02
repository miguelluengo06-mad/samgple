import type { VideoStatus } from '@/lib/videos';

export interface VideoRequest {
  id: string;
  customer_email: string;
  customer_name: string | null;
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
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Avatar {
  id: string;
  name: string;
  style: string;
  gender: string;
  tags: string[];
  image_url: string;
  preview_url: string | null;
  active: boolean;
}
