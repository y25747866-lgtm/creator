import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { platform, apiKey, action } = await req.json();

    if (!platform || !["whop", "payhip"].includes(platform)) {
      throw new Error("Invalid platform");
    }

    // Disconnect action
    if (action === "disconnect") {
      await supabase.from("platform_connections").delete().eq("user_id", user.id).eq("platform", platform);
      // Also delete analytics data for this platform
      await supabase.from("analytics_data").delete().eq("user_id", user.id).eq("platform", platform);
      return new Response(JSON.stringify({ success: true, message: "Disconnected" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!apiKey) throw new Error("API key is required");

    // Verify API key by making a test request
    let verified = false;
    if (platform === "whop") {
      const res = await fetch("https://api.whop.com/api/v5/company", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      verified = res.ok;
    } else if (platform === "payhip") {
      // Payhip uses a simpler API - verify by fetching products
      const res = await fetch("https://payhip.com/api/v1/product/list", {
        headers: { "payhip-api-key": apiKey },
      });
      verified = res.ok;
    }

    if (!verified) {
      return new Response(JSON.stringify({ success: false, error: "Invalid API key" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Simple encoding (base64) - in production use proper encryption
    const encoded = btoa(apiKey);

    // Upsert connection
    const { error: upsertError } = await supabase.from("platform_connections").upsert({
      user_id: user.id,
      platform,
      api_key_encrypted: encoded,
      status: "connected",
      connected_at: new Date().toISOString(),
    }, { onConflict: "user_id,platform" });

    if (upsertError) throw upsertError;

    return new Response(JSON.stringify({ success: true, message: "Connected successfully" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analytics-connect error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
