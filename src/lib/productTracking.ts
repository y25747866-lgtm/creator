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

export async function createTrackedProduct(params: {
  title: string;
  topic: string;
  description?: string;
  length: string;
  content: string;
  coverImageUrl: string | null;
  pages: number;
}) {
  const headers = await getHeaders();
  const res = await fetch(`${BASE_URL}/functions/v1/product-tracking?action=create-product`, {
    method: "POST",
    headers,
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error("Failed to save product");
  return res.json();
}

export async function recordMetric(productId: string, metricType: string, value = 1, metadata?: Record<string, unknown>): Promise<void> {
  try {
    const headers = await getHeaders();
    const res = await fetch(`${BASE_URL}/functions/v1/product-tracking?action=record-metric`, {
      method: "POST",
      headers,
      body: JSON.stringify({ productId, metricType, value, metadata }),
    });
    if (!res.ok) {
      console.error("Failed to record metric:", res.statusText);
    }
  } catch (error) {
    console.error("Error recording metric:", error);
  }
}

export async function submitFeedback(params: {
  productId: string;
  rating?: number;
  comment?: string;
  sectionReference?: string;
  feedbackType?: string;
}) {
  const headers = await getHeaders();
  const res = await fetch(`${BASE_URL}/functions/v1/product-tracking?action=submit-feedback`, {
    method: "POST",
    headers,
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error("Failed to submit feedback");
  return res.json();
}

export async function listProducts() {
  const headers = await getHeaders();
  const res = await fetch(`${BASE_URL}/functions/v1/product-tracking?action=list-products`, {
    method: "GET",
    headers,
  });
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
}

export async function getProductMetrics(productId: string) {
  const headers = await getHeaders();
  const res = await fetch(`${BASE_URL}/functions/v1/product-tracking?action=get-metrics&productId=${productId}`, {
    method: "GET",
    headers,
  });
  if (!res.ok) throw new Error("Failed to fetch metrics");
  return res.json();
}

export async function getProductFeedback(productId: string) {
  const headers = await getHeaders();
  const res = await fetch(`${BASE_URL}/functions/v1/product-tracking?action=get-feedback&productId=${productId}`, {
    method: "GET",
    headers,
  });
  if (!res.ok) throw new Error("Failed to fetch feedback");
  return res.json();
}

export async function getProductVersions(productId: string) {
  const headers = await getHeaders();
  const res = await fetch(`${BASE_URL}/functions/v1/product-tracking?action=get-versions&productId=${productId}`, {
    method: "GET",
    headers,
  });
  if (!res.ok) throw new Error("Failed to fetch versions");
  return res.json();
}
