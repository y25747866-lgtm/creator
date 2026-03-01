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

/*
MARKETING SYSTEM MODULE TYPES
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
DATA TYPES
*/

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

/*
CREATE PRODUCT
*/

export async function createMonetizationProduct(params: {
  title: string;
  topic: string;
  description?: string;
  sourceType?: string;
  sourceProductId?: string;
}) {
  const headers = await getHeaders();

  const res = await fetch(
    `${BASE_URL}/functions/v1/monetization?action=create-product`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(params),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to create campaign");
  }

  return res.json();
}

/*
CREATE MODULE — FIXED (this was the bug)
*/

export async function createMonetizationModule(params: {
  productId: string;
  moduleType: string;
  title: string;
}) {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;

  if (!userId) throw new Error("User not authenticated. Please log in again.");

  const { data, error } = await supabase
    .from("monetization_modules")
    .insert({
      product_id: params.productId,
      module_type: params.moduleType,
      title: params.title,
      status: "draft",
      user_id: userId,   // ← THIS FIXES THE "undefined id" ERROR
    })
    .select()
    .single();

  if (error) {
    console.error("Module insert error:", error);
    throw new Error(`Failed to create module: ${error.message}`);
  }

  if (!data) throw new Error("Module creation returned no data");

  return { module: data };
}

/*
GENERATE CONTENT
*/

export async function generateModuleContent(params: {
  moduleId: string;
}) {
  if (!params.moduleId) throw new Error("Module ID is required");

  const headers = await getHeaders();

  const res = await fetch(
    `${BASE_URL}/functions/v1/generate-module-content`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ moduleId: params.moduleId }),
    }
  );

  if (!res.ok) {
    let message = "Generation failed";
    try {
      const err = await res.json();
      message = err.error || message;
    } catch {}
    throw new Error(message);
  }

  return await res.json();
}

/*
LIST PRODUCTS
*/

export async function listMonetizationProducts() {
  const headers = await getHeaders();

  const res = await fetch(
    `${BASE_URL}/functions/v1/monetization?action=list-products`,
    {
      method: "GET",
      headers,
    }
  );

  if (!res.ok) throw new Error("Failed to fetch campaigns");

  return res.json();
}

/*
GET MODULE CONTENT
*/

export async function getModuleWithVersions(moduleId: string) {
  const headers = await getHeaders();

  const res = await fetch(
    `\( {BASE_URL}/functions/v1/monetization?action=get-module&moduleId= \){moduleId}`,
    {
      method: "GET",
      headers,
    }
  );

  if (!res.ok) throw new Error("Failed to fetch asset");

  return res.json();
}

/*
METRICS
*/

export async function recordMonetizationMetric(
  moduleId: string,
  eventType: string,
  metadata?: Record<string, unknown>
) {
  const headers = await getHeaders();

  await fetch(
    `${BASE_URL}/functions/v1/monetization?action=record-metric`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        moduleId,
        eventType,
        metadata,
      }),
    }
  );
}
