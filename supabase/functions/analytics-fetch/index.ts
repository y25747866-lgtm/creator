import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAccess, corsHeaders, errorResponse } from "../_shared/validation.ts";

async function fetchWhopData(apiKey: string) {
  const headers = { Authorization: `Bearer ${apiKey}` };
  let products: any[] = [];
  let orders: any[] = [];

  try {
    console.log("Fetching Whop products with key:", apiKey.substring(0, 10) + "...");
    const res = await fetch("https://api.whop.com/api/v5/company/products", { headers });
    if (res.ok) {
      const data = await res.json();
      products = (data.data || []).filter((p: any) => p && typeof p === 'object');
      console.log("✅ Whop products fetched:", products.length);
    } else {
      const errText = await res.text();
      console.error("❌ Whop products error:", res.status, errText);
    }
  } catch (e) { 
    console.error("❌ Whop products fetch exception:", e); 
  }

  try {
    console.log("Fetching Whop memberships...");
    const res = await fetch("https://api.whop.com/api/v5/company/memberships?per=100", { headers });
    if (res.ok) {
      const data = await res.json();
      orders = (data.data || []).filter((o: any) => o && typeof o === 'object');
      console.log("✅ Whop memberships fetched:", orders.length);
    } else {
      const errText = await res.text();
      // Whop API might return 401 if key is invalid
      console.error("❌ Whop memberships error:", res.status, errText);
    }
  } catch (e) { 
    console.error("❌ Whop memberships fetch exception:", e); 
  }

  // ✅ Calculate conversion rate based on actual data
  const completedOrders = orders.filter((o: any) => o?.status === "active" || o?.status === "completed").length;
  const conversionRate = orders.length > 0 ? parseFloat(((completedOrders / orders.length) * 100).toFixed(2)) : 0;

  const totalRevenue = orders.reduce((sum: number, o: any) => {
    const amount = parseFloat(o?.amount_total || "0") / 100;
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);
  
  const totalSales = orders.length;
  const activeProducts = products.length;

  return {
    summary: { totalRevenue, totalSales, activeProducts, conversionRate },
    products: products.map((p: any) => ({ 
      id: p?.id || "unknown", 
      name: p?.name || p?.title || "Unknown Product", 
      price: parseFloat(p?.initial_price || "0"), 
      platform: "whop",
      description: p?.description || ""
    })),
    orders: orders.slice(0, 50).map((o: any) => ({
      id: o?.id || "unknown",
      product: o?.product?.name || "Unknown",
      amount: parseFloat(o?.amount_total || "0") / 100,
      date: o?.created_at || new Date().toISOString(),
      status: o?.status || "unknown",
      platform: "whop",
    })),
  };
}

async function fetchPayhipData(apiKey: string) {
  const headers = { "payhip-api-key": apiKey };
  let products: any[] = [];
  let sales: any[] = [];

  try {
    console.log("Fetching Payhip products with key:", apiKey.substring(0, 10) + "...");
    const res = await fetch("https://payhip.com/api/v1/product/list", { headers });
    if (res.ok) {
      const data = await res.json();
      products = ((data.data || data.products || []) as any[]).filter((p: any) => p && typeof p === 'object');
      console.log("✅ Payhip products fetched:", products.length);
    } else {
      const errText = await res.text();
      console.error("❌ Payhip products error:", res.status, errText);
    }
  } catch (e) { 
    console.error("❌ Payhip products fetch exception:", e); 
  }

  try {
    console.log("Fetching Payhip sales...");
    const res = await fetch("https://payhip.com/api/v1/sale/list", { headers });
    if (res.ok) {
      const data = await res.json();
      sales = ((data.data || data.sales || []) as any[]).filter((s: any) => s && typeof s === 'object');
      console.log("✅ Payhip sales fetched:", sales.length);
    } else {
      const errText = await res.text();
      console.error("❌ Payhip sales error:", res.status, errText);
    }
  } catch (e) { 
    console.error("❌ Payhip sales fetch exception:", e); 
  }

  // ✅ Calculate conversion rate based on actual data
  const totalRevenue = sales.reduce((sum: number, s: any) => {
    const amount = parseFloat(s?.total || s?.amount || "0");
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);
  
  const totalSales = sales.length;
  const conversionRate = products.length > 0 ? parseFloat(((totalSales / (products.length * 10)) * 100).toFixed(2)) : 0;

  return {
    summary: { totalRevenue, totalSales, activeProducts: products.length, conversionRate },
    products: products.map((p: any) => ({ 
      id: p?.id || p?.product_id || "unknown", 
      name: p?.name || p?.title || "Unknown Product", 
      price: parseFloat(p?.price || "0"), 
      platform: "payhip",
      description: p?.description || ""
    })),
    orders: sales.slice(0, 50).map((s: any) => ({
      id: s?.id || s?.sale_id || "unknown",
      product: s?.product_name || s?.product || "Unknown",
      amount: parseFloat(s?.total || s?.amount || "0"),
      date: s?.date || s?.created_at || new Date().toISOString(),
      status: "completed",
      platform: "payhip",
    })),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ✅ STRICT SUBSCRIPTION ENFORCEMENT
    const access = await verifyAccess(req);
    if (!access.authorized) {
      return errorResponse(access.error || "Unauthorized", 401);
    }

    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not found after verification");

    const body = await req.json();
    const { platform } = body;

    // Fetch from all connected platforms if no specific platform
    const { data: connections, error: connError } = await supabase
      .from("platform_connections")
      .select("*")
      .eq("user_id", user.id);

    if (connError) throw connError;

    if (!connections || connections.length === 0) {
      return new Response(JSON.stringify({ 
        summary: { totalRevenue: 0, totalSales: 0, activeProducts: 0, conversionRate: 0 }, 
        products: [], 
        orders: [] 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let allData = { 
      summary: { totalRevenue: 0, totalSales: 0, activeProducts: 0, conversionRate: 0 }, 
      products: [] as any[], 
      orders: [] as any[] 
    };

    for (const conn of connections) {
      if (platform && conn.platform !== platform) continue;
      
      const apiKey = conn.api_key_encrypted;
      if (!apiKey) {
        console.warn("⚠️ No API key for platform:", conn.platform);
        continue;
      }

      let platformData;

      try {
        if (conn.platform === "whop") {
          platformData = await fetchWhopData(apiKey);
        } else if (conn.platform === "payhip") {
          platformData = await fetchPayhipData(apiKey);
        } else {
          console.warn("⚠️ Unknown platform:", conn.platform);
          continue;
        }

        if (platformData) {
          allData.summary.totalRevenue += platformData.summary.totalRevenue;
          allData.summary.totalSales += platformData.summary.totalSales;
          allData.summary.activeProducts += platformData.summary.activeProducts;
          allData.products.push(...platformData.products);
          allData.orders.push(...platformData.orders);
        }
      } catch (e) {
        console.error(`❌ Error fetching ${conn.platform} data:`, e);
      }

      // Update last sync
      try {
        await supabase.from("platform_connections").update({ last_sync_at: new Date().toISOString() }).eq("id", conn.id);
      } catch (e) {
        console.error("Error updating sync time:", e);
      }
    }

    // Store analytics data
    try {
      await supabase.from("analytics_data").upsert({
        user_id: user.id,
        platform: platform || "all",
        data_type: "summary",
        data: allData,
        fetched_at: new Date().toISOString(),
      }, { onConflict: "user_id,platform" }).select();
    } catch (e) {
      console.error("Error storing analytics data:", e);
    }

    // Sort orders by date
    allData.orders.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });

    console.log("✅ Analytics fetch complete:", {
      totalRevenue: allData.summary.totalRevenue,
      totalSales: allData.summary.totalSales,
      productCount: allData.products.length,
      orderCount: allData.orders.length
    });

    return new Response(JSON.stringify(allData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("❌ analytics-fetch error:", e);
    return errorResponse(msg, 500);
  }
});
