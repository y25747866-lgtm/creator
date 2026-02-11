import { supabase } from "@/integrations/supabase/client";

const BASE_URL = import.meta.env.VITE_SUPABASE_URL;

async function getHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session?.access_token || ""}`,
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
}

export const MODULE_TYPES = [
  { value: "course", label: "Online Course", description: "Full course with modules, lessons, and exercises" },
  { value: "lead_magnet", label: "Lead Magnet", description: "High-value freebie to capture emails" },
  { value: "prompt_pack", label: "Prompt Pack", description: "Curated AI prompts for your niche" },
  { value: "landing_page", label: "Landing Page", description: "High-converting sales page copy" },
  { value: "email_sequence", label: "Email Sequence", description: "Welcome, nurture, and sales emails" },
  { value: "affiliate_funnel", label: "Affiliate Funnel", description: "Complete affiliate marketing system" },
  { value: "upsell_offer", label: "Upsell / Downsell", description: "Post-purchase offer strategy" },
  { value: "micro_saas_blueprint", label: "Micro SaaS Blueprint", description: "SaaS concept from your expertise" },
] as const;

export type ModuleType = typeof MODULE_TYPES[number]["value"];

export interface MonetizationProduct {
  id: string;
  user_id: string;
  title: string;
  topic: string;
  description: string | null;
  source_type: string;
  source_product_id: string | null;
  created_at: string;
  monetization_modules?: MonetizationModule[];
}

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
  content: { markdown: string };
  prompt_used: string | null;
  model_used: string | null;
  version_number: number;
  created_at: string;
}

export async function createMonetizationProduct(params: {
  title: string;
  topic: string;
  description?: string;
  sourceType?: string;
  sourceProductId?: string;
}) {
  const headers = await getHeaders();
  const res = await fetch(`${BASE_URL}/functions/v1/monetization?action=create-product`, {
    method: "POST",
    headers,
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to create product" }));
    throw new Error(err.error || "Failed to create product");
  }
  return res.json();
}

export async function createMonetizationModule(params: {
  productId: string;
  moduleType: string;
  title: string;
}) {
  const headers = await getHeaders();
  const res = await fetch(`${BASE_URL}/functions/v1/monetization?action=create-module`, {
    method: "POST",
    headers,
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to create module" }));
    throw new Error(err.error || "Failed to create module");
  }
  return res.json();
}

export async function generateModuleContent(params: {
  moduleId: string;
  moduleType: string;
  title: string;
  topic: string;
  description?: string;
  sourceContent?: string;
}) {
  const headers = await getHeaders();
  const res = await fetch(`${BASE_URL}/functions/v1/monetization?action=generate-module`, {
    method: "POST",
    headers,
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Generation failed" }));
    throw new Error(err.error || "Generation failed");
  }
  return res.json();
}

export async function listMonetizationProducts() {
  const headers = await getHeaders();
  const res = await fetch(`${BASE_URL}/functions/v1/monetization?action=list-products`, {
    method: "GET",
    headers,
  });
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
}

export async function getModuleWithVersions(moduleId: string) {
  const headers = await getHeaders();
  const res = await fetch(`${BASE_URL}/functions/v1/monetization?action=get-module&moduleId=${moduleId}`, {
    method: "GET",
    headers,
  });
  if (!res.ok) throw new Error("Failed to fetch module");
  return res.json();
}

export async function recordMonetizationMetric(moduleId: string, eventType: string, metadata?: Record<string, unknown>) {
  const headers = await getHeaders();
  await fetch(`${BASE_URL}/functions/v1/monetization?action=record-metric`, {
    method: "POST",
    headers,
    body: JSON.stringify({ moduleId, eventType, metadata }),
  });
}
