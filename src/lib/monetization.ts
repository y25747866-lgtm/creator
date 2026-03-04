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
] as const;

/* ===============================
   CREATE PRODUCT (Diplomat core)
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
  console.log("🚀 [Diplomat] Creating product:", { title, topic, sourceType });

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
    console.error("❌ [Diplomat] Product creation failed:", error);
    throw new Error(`Diplomat product creation failed: ${error.message}`);
  }

  console.log("✅ [Diplomat] Product created successfully:", data);
  return data;
}

/* ===============================
   CREATE MODULE (Diplomat core)
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
  console.log("🚀 [Diplomat] Creating module:", { productId, moduleType, title });

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
    console.error("❌ [Diplomat] Module creation failed:", error);
    throw new Error(`Diplomat module creation failed: ${error.message}`);
  }

  console.log("✅ [Diplomat] Module created successfully:", data);
  return data;
     }
