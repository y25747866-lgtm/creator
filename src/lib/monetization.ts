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
CREATE MODULE
*/

export async function createMonetizationModule(params: {
  productId: string;
  moduleType: string;
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

  if (error) {
    console.error("createMonetizationModule error:", error);
    throw new Error(`Failed to create ${params.moduleType}: ${error.message}`);
  }

  if (!data || !data.id) {
    console.error("createMonetizationModule returned no data:", data);
    throw new Error(`Module creation failed for ${params.moduleType} — no ID returned`);
  }

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
CREATE PRODUCT
*/

export async function createMonetizationProduct(params: any) {
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
    throw new Error(err.error || "Failed to create product");
  }

  return res.json();
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
FIXED FUNCTION — THIS WAS THE BUG
*/

export async function getModuleWithVersions(moduleId: string) {
  const headers = await getHeaders();

  const res = await fetch(
    `${BASE_URL}/functions/v1/monetization?action=get-module&moduleId=${moduleId}`,
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
      body: JSON.stringify({ moduleId, eventType, metadata }),
    }
  );
}
