import { supabase } from "@/integrations/supabase/client";

const BASE_URL = import.meta.env.VITE_SUPABASE_URL;

/*
HEADERS
*/

async function getHeaders() {
  const { data: { session } } = await supabase.auth.getSession();

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session?.access_token || ""}`,
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
}


/*
MODULE TYPES
*/

export const MODULE_TYPES = [
  { value: "landing_page", label: "Landing Page", description: "High-converting sales page copy" },
  { value: "email_sequence", label: "Email Campaign", description: "Welcome, nurture, and sales emails" },
  { value: "lead_magnet", label: "Lead Magnet", description: "Free resource to capture emails" },
  { value: "social_content", label: "Social Media Content", description: "Twitter, Instagram, TikTok posts" },
  { value: "ad_copy", label: "Ad Copy", description: "Facebook, Google, TikTok ads" },
  { value: "video_script", label: "Video Script", description: "YouTube, TikTok, Reel scripts" },
  { value: "affiliate_funnel", label: "Affiliate Funnel", description: "Full affiliate system" },
  { value: "course", label: "Mini Course", description: "Course outline and lessons" },
] as const;

export type ModuleType = typeof MODULE_TYPES[number]["value"];


/*
CREATE PRODUCT
*/

export async function createMonetizationProduct(params: {
  title: string;
  topic: string;
  description?: string;
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

  if (!res.ok)
    throw new Error("Failed to create campaign");

  return res.json();
}


/*
CREATE MODULE
*/

export async function createMonetizationModule(params: {
  productId: string;
  moduleType: string;
  title: string;
}) {

  const headers = await getHeaders();

  const res = await fetch(
    `${BASE_URL}/functions/v1/monetization?action=create-module`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(params),
    }
  );

  if (!res.ok)
    throw new Error("Failed to create asset");

  return res.json();
}


/*
GENERATE CONTENT
THIS IS THE CRITICAL FIX
NOW CALLS THE REAL AI FUNCTION
*/

export async function generateModuleContent(params: {
  moduleId: string;
}) {

  if (!params.moduleId)
    throw new Error("Module ID missing");

  const headers = await getHeaders();

  const res = await fetch(
    `${BASE_URL}/functions/v1/generate-module-content`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        moduleId: params.moduleId,
      }),
    }
  );

  if (!res.ok) {

    const text = await res.text();

    console.error(text);

    throw new Error("AI generation failed");
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

  if (!res.ok)
    throw new Error("Failed to fetch campaigns");

  return res.json();
}


/*
GET MODULE
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

  if (!res.ok)
    throw new Error("Failed to fetch asset");

  return res.json();
   }
