import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function fetchWhopData(apiKey: string) {
  const headers = { Authorization: `Bearer ${apiKey}` };

  // Fetch products
  let products: any[] = [];
  try {
    const res = await fetch("https://api.whop.com/api/v5/company/products", { headers });
    if (res.ok) {
      const data = await res.json();
      products = data.data || [];
    }
  } catch (e) { console.error("Whop products fetch:", e); }

  // Fetch memberships (as orders proxy)
  let orders: any[] = [];
  try {
    const res = await fetch("https://api.whop.com/api/v5/company/memberships?per=100", { headers });
    if (res.ok) {
      const data = await res.json();
      orders = data.data || [];
    }
  } catch (e) { console.error("Whop orders fetch:", e); }

  const totalRevenue = orders.reduce((sum: number, o: any) => sum + (parseFloat(o.amount_total || "0") / 100), 0);
  const totalSales = orders.length;
  const activeProducts = products.length;

  return {
    summary: { totalRevenue, totalSales, activeProducts, conversionRate: 0 },
    products: products.map((p: any) => ({ id: p.id, name: p.name || p.title, price: p.initial_price, platform: "whop" })),
    orders: orders.slice(0, 50).map((o: any) => ({
      id: o.id,
      product: o.product?.name || "Unknown",
      amount: parseFloat(o.amount_total || "0") / 100,
      date: o.created_at,
      status: o.status,
      platform: "whop",
    })),
  };
}

async function fetchPayhipData(apiKey: string) {
  const headers = { "payhip-api-key": apiKey };

  let products: any[] = [];
  try {
    const res = await fetch("https://payhip.com/api/v1/product/list", { headers });
    if (res.ok) {
      const data = await res.json();
      products = data.data || data.products || [];
    }
  } catch (e) { console.error("Payhip products fetch:", e); }

  // Fetch sales
  let sales: any[] = [];
  try {
    const res = await fetch("https://payhip.com/api/v1/sale/list", { headers });
    if (res.ok) {
      const data = await res.json();
      sales = data.data || data.sales || [];
    }
  } catch (e) { console.error("Payhip sales fetch:", e); }

  const totalRevenue = sales.reduce((sum: number, s: any) => sum + parseFloat(s.total || s.amount || "0"), 0);
  const totalSales = sales.length;

  return {
    summary: { totalRevenue, totalSales, activeProducts: products.length, conversionRate: 0 },
    products: products.map((p: any) => ({ id: p.id || p.product_id, name: p.name || p.title, price: p.price, platform: "payhip" })),
    orders: sales.slice(0, 50).map((s: any) => ({
      id: s.id || s.sale_id,
      product: s.product_name || s.product || "Unknown",
      amount: parseFloat(s.total || s.amount || "0"),
      date: s.date || s.created_at,
      status: "completed",
      platform: "payhip",
    })),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { platform } = await req.json();

    // Get connection
    const { data: connection } = await supabase
      .from("platform_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("platform", platform || "all")
      .maybeSingle();

    // Fetch from all connected platforms if no specific platform
    const { data: connections } = await supabase
      .from("platform_connections")
      .select("*")
      .eq("user_id", user.id);

    if (!connections || connections.length === 0) {
      return new Response(JSON.stringify({ summary: { totalRevenue: 0, totalSales: 0, activeProducts: 0, conversionRate: 0 }, products: [], orders: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let allData = { summary: { totalRevenue: 0, totalSales: 0, activeProducts: 0, conversionRate: 0 }, products: [] as any[], orders: [] as any[] };

    for (const conn of connections) {
      if (platform && conn.platform !== platform) continue;
      const apiKey = atob(conn.api_key_encrypted);
      let platformData;

      if (conn.platform === "whop") {
        platformData = await fetchWhopData(apiKey);
      } else if (conn.platform === "payhip") {
        platformData = await fetchPayhipData(apiKey);
      }

      if (platformData) {
        allData.summary.totalRevenue += platformData.summary.totalRevenue;
        allData.summary.totalSales += platformData.summary.totalSales;
        allData.summary.activeProducts += platformData.summary.activeProducts;
        allData.products.push(...platformData.products);
        allData.orders.push(...platformData.orders);
      }

      // Update last sync
      await supabase.from("platform_connections").update({ last_sync_at: new Date().toISOString() }).eq("id", conn.id);
    }

    // Store analytics data
    await supabase.from("analytics_data").upsert({
      user_id: user.id,
      platform: platform || "all",
      data_type: "summary",
      data: allData,
      fetched_at: new Date().toISOString(),
    }, { onConflict: "user_id,platform" }).select();

    // Sort orders by date
    allData.orders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return new Response(JSON.stringify(allData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("analytics-fetch error:", e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
