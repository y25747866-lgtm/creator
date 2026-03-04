import { supabase } from "@/integrations/supabase/client";

/* ===============================
   TYPES
================================= */

export type ModuleType =
  | "landing_page"
  | "email_sequence"
  | "sales_page"
  | "lead_magnet";

export const MODULE_TYPES = [
  {
    value: "landing_page",
    label: "Landing Page",
    description: "High-converting landing page",
  },
  {
    value: "email_sequence",
    label: "Email Sequence",
    description: "Automated email funnel",
  },
  {
    value: "sales_page",
    label: "Sales Page",
    description: "Long-form sales page",
  },
  {
    value: "lead_magnet",
    label: "Lead Magnet",
    description: "Free downloadable offer",
  },
];

/* ===============================
   CREATE PRODUCT
================================= */

export async function createMonetizationProduct({
  title,
  topic,
  description,
  sourceType,
}: {
  title: string;
  topic: string;
  description?: string;
  sourceType: string;
}) {
  const { data, error } = await supabase
    .from("monetization_products")
    .insert({
      title,
      topic,
      description,
      source_type: sourceType,
    })
    .select()
    .single();

  if (error) {
    console.error("Product insert error:", error);
    throw error;
  }

  return data;
}

/* ===============================
   CREATE MODULE
================================= */

export async function createMonetizationModule({
  productId,
  moduleType,
  title,
}: {
  productId: string;
  moduleType: ModuleType;
  title: string;
}) {
  const { data, error } = await supabase
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
    console.error("Module insert error:", error);
    throw error;
  }

  return data;
}

/* ===============================
   GENERATE MODULE CONTENT
================================= */

export async function generateModuleContent({
  moduleId,
}: {
  moduleId: string;
}) {
  const { data, error } = await supabase.functions.invoke(
    "generate-module-content",
    {
      body: { moduleId },
    }
  );

  if (error) {
    console.error("Edge function error:", error);
    throw error;
  }

  return data;
      }
