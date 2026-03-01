// /src/lib/monetization.ts

import { createClient } from "@supabase/supabase-js";

/*
------------------------------------------------
SUPABASE CLIENT
------------------------------------------------
*/

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

/*
------------------------------------------------
MODULE TYPES
------------------------------------------------
*/

export type ModuleType =
  | "landing_page"
  | "email_sequence"
  | "ad_copy"
  | "social_content"
  | "prompt_pack"
  | "affiliate_funnel"
  | "course"
  | "lead_magnet";

export const MODULE_TYPES: {
  value: ModuleType;
  label: string;
  description: string;
}[] = [
  {
    value: "landing_page",
    label: "Landing Page",
    description:
      "High-converting sales page",
  },
  {
    value: "email_sequence",
    label: "Email Sequence",
    description:
      "Automated 5-email funnel",
  },
  {
    value: "ad_copy",
    label: "Ad Copy",
    description:
      "Facebook & Google ads",
  },
  {
    value: "social_content",
    label: "Social Content",
    description:
      "Posts for TikTok, X, Instagram",
  },
  {
    value: "prompt_pack",
    label: "Prompt Pack",
    description:
      "AI prompts for your niche",
  },
  {
    value: "affiliate_funnel",
    label: "Affiliate Funnel",
    description:
      "Complete affiliate system",
  },
  {
    value: "course",
    label: "Mini Course",
    description:
      "Turn into digital course",
  },
  {
    value: "lead_magnet",
    label: "Lead Magnet",
    description:
      "Free download to capture leads",
  },
];

/*
------------------------------------------------
CREATE PRODUCT
------------------------------------------------
*/

export async function createMonetizationProduct({
  title,
  topic,
  description,
  sourceType,
  sourceProductId,
}: {
  title: string;
  topic: string;
  description?: string;
  sourceType: "ebook" | "idea";
  sourceProductId?: string;
}) {
  const { data, error } =
    await supabase
      .from("monetization_products")
      .insert({
        title,
        topic,
        description,
        source_type: sourceType,
        source_product_id:
          sourceProductId || null,
        status: "draft",
      })
      .select()
      .single();

  if (error) {
    console.error(error);
    throw error;
  }

  return { product: data };
}

/*
------------------------------------------------
CREATE MODULE
------------------------------------------------
*/

export async function createMonetizationModule({
  productId,
  moduleType,
  title,
}: {
  productId: string;
  moduleType: ModuleType;
  title: string;
}) {
  const { data, error } =
    await supabase
      .from("monetization_modules")
      .insert({
        product_id: productId,
        module_type: moduleType,
        title,
        status: "draft",
      })
      .select()
      .single();

  if (error) {
    console.error(error);
    throw error;
  }

  return { module: data };
}

/*
------------------------------------------------
GENERATE MODULE CONTENT (EDGE FUNCTION)
THIS IS THE MOST IMPORTANT PART
------------------------------------------------
*/

export async function generateModuleContent({
  moduleId,
}: {
  moduleId: string;
}) {
  const response = await fetch(
    `${supabaseUrl}/functions/v1/generate-module-content`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",

        Authorization:
          `Bearer ${supabaseAnonKey}`,
      },

      body: JSON.stringify({
        moduleId,
      }),
    }
  );

  if (!response.ok) {
    const text =
      await response.text();

    console.error(
      "Edge function error:",
      text
    );

    throw new Error(text);
  }

  return await response.json();
}

/*
------------------------------------------------
GET MODULES FOR PRODUCT
------------------------------------------------
*/

export async function getModules(
  productId: string
) {
  const { data, error } =
    await supabase
      .from("monetization_modules")
      .select("*")
      .eq("product_id", productId)
      .order("created_at", {
        ascending: true,
      });

  if (error) throw error;

  return data;
}

/*
------------------------------------------------
GET MODULE CONTENT VERSIONS
------------------------------------------------
*/

export async function getModuleVersions(
  moduleId: string
) {
  const { data, error } =
    await supabase
      .from("monetization_versions")
      .select("*")
      .eq("module_id", moduleId)
      .order("version_number", {
        ascending: false,
      });

  if (error) throw error;

  return data;
}

/*
------------------------------------------------
DELETE MODULE
------------------------------------------------
*/

export async function deleteModule(
  moduleId: string
) {
  const { error } =
    await supabase
      .from("monetization_modules")
      .delete()
      .eq("id", moduleId);

  if (error) throw error;
  }
