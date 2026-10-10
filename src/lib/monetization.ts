import { supabase } from "@/integrations/supabase/client";
import type { KeysetCursor } from "@/lib/keysetPagination";

/*
==========================================
MODULE TYPES (kept for backward compat)
==========================================
*/

export const MODULE_TYPES = [
  { value: "landing_page", label: "Landing Page", description: "High-converting sales page copy" },
  { value: "email_sequence", label: "Email Campaign", description: "Welcome, nurture, and sales emails" },
  { value: "lead_magnet", label: "Lead Magnet", description: "Free resource to capture emails" },
  { value: "social_content", label: "Social Media Content", description: "Twitter, Instagram, TikTok posts" },
  { value: "ad_copy", label: "Ad Copy", description: "Facebook, Google, TikTok ads" },
  { value: "video_script", label: "Video Script", description: "YouTube, TikTok, Reel scripts" },
  { value: "affiliate_funnel", label: "Affiliate Funnel", description: "Full affiliate promotion system" },
  { value: "course", label: "Mini Course", description: "Course outline and lessons" },
] as const;

export type ModuleType = typeof MODULE_TYPES[number]["value"];

/*
==========================================
TYPES
==========================================
*/

export interface MonetizationModule {
  id: string;
  product_id: string;
  module_type: string;
  title: string;
  status: string;
  created_at: string;
}

export interface MonetizationVersion {
  id: string;
  module_id: string;
  version_number: number;
  content: { markdown?: string } & Record<string, unknown>;
  model_used?: string | null;
  created_at: string;
}

export interface MonetizationProduct {
  id: string;
  user_id: string;
  title: string;
  topic: string;
  description?: string | null;
  source_type: string;
  created_at: string;
  monetization_modules?: MonetizationModule[];
  moduleNextCursor?: KeysetCursor | null;
  moduleHasMore?: boolean;
}

/*
==========================================
ENV SAFETY
==========================================
*/

const BASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

if (!BASE_URL) throw new Error("VITE_SUPABASE_URL is not defined");
if (!PUBLISHABLE_KEY) throw new Error("VITE_SUPABASE_PUBLISHABLE_KEY is not defined");

/*
==========================================
AUTH HEADERS
==========================================
*/

async function getHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: PUBLISHABLE_KEY,
  };
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  return headers;
}

/*
==========================================
CREATE PRODUCT
==========================================
*/

export async function createMonetizationProduct(params: Record<string, unknown>) {
  const headers = await getHeaders();
  const res = await fetch(`${BASE_URL}/functions/v1/monetization?action=create-product`, {
    method: "POST",
    headers,
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = err && typeof err === "object" ? (err as Record<string, unknown>).error : undefined;
    throw new Error(typeof message === "string" ? message : "Failed to create product");
  }
  const data = await res.json();
  if (!data?.id && !data?.product?.id) throw new Error("Product created but no ID returned");
  return data.product || data;
}

/*
==========================================
CREATE MODULE
==========================================
*/

export async function createMonetizationModule(params: {
  productId: string;
  moduleType: ModuleType;
  title: string;
}) {
  const { data, error } = await supabase
    .from("monetization_modules")
    .insert({
      product_id: params.productId,
      module_type: params.moduleType,
      title: params.title,
      status: "draft",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error("Module created but no ID returned");
  return data;
}

/*
==========================================
GENERATE MODULE CONTENT
==========================================
*/

export async function generateModuleContent(params: { moduleId: string }) {
  if (!params.moduleId) throw new Error("Module ID is required");
  const headers = await getHeaders();
  const res = await fetch(`${BASE_URL}/functions/v1/monetization?action=generate-module`, {
    method: "POST",
    headers,
    body: JSON.stringify({ moduleId: params.moduleId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = err && typeof err === "object" ? (err as Record<string, unknown>).error : undefined;
    throw new Error(typeof message === "string" ? message : "Generation failed");
  }
  return res.json();
}

/*
==========================================
LIST PRODUCTS
==========================================
*/

export async function listMonetizationProducts(cursor: KeysetCursor | null = null) {
  const headers = await getHeaders();
  const params = new URLSearchParams({ action: "list-products" });
  if (cursor) params.set("cursor", JSON.stringify(cursor));
  const res = await fetch(`${BASE_URL}/functions/v1/monetization?${params}`, {
    method: "GET",
    headers,
  });
  if (!res.ok) throw new Error("Failed to fetch campaigns");
  return res.json() as Promise<{ products: MonetizationProduct[]; nextCursor: KeysetCursor | null; hasMore: boolean }>;
}

export async function listMonetizationModules(productId: string, cursor: KeysetCursor | null = null) {
  const headers = await getHeaders();
  const params = new URLSearchParams({ action: "list-modules-page", productId });
  if (cursor) params.set("cursor", JSON.stringify(cursor));
  const res = await fetch(`${BASE_URL}/functions/v1/monetization?${params}`, { method: "GET", headers });
  if (!res.ok) throw new Error("Failed to fetch campaign assets");
  return res.json() as Promise<{ items: MonetizationModule[]; nextCursor: KeysetCursor | null; hasMore: boolean }>;
}

/*
==========================================
GET MODULE + VERSIONS
==========================================
*/

export async function getModuleWithVersions(moduleId: string, cursor: KeysetCursor | null = null) {
  if (!moduleId) throw new Error("Module ID required");
  const headers = await getHeaders();
  const params = new URLSearchParams({ action: "get-module", moduleId });
  if (cursor) params.set("cursor", JSON.stringify(cursor));
  const res = await fetch(`${BASE_URL}/functions/v1/monetization?${params}`, { method: "GET", headers });
  if (!res.ok) throw new Error("Failed to fetch asset");
  return res.json();
}

/*
==========================================
RECORD METRIC
==========================================
*/

export async function recordMonetizationMetric(
  moduleId: string,
  eventType: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const headers = await getHeaders();
    const res = await fetch(`${BASE_URL}/functions/v1/monetization?action=record-metric`, {
      method: "POST",
      headers,
      body: JSON.stringify({ moduleId, eventType, metadata }),
    });
    if (!res.ok) {
      console.error("Metric recording failed:", res.statusText);
    }
  } catch (error) {
    console.error("Error recording monetization metric:", error);
  }
}
