import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { platform, apiKey, action } = await req.json();

    // Handle disconnect
    if (action === "disconnect") {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await supabaseAdmin
        .from("platform_connections")
        .delete()
        .eq("user_id", user.id)
        .eq("platform", platform);

      return new Response(
        JSON.stringify({ success: true, message: "Disconnected" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!platform || !apiKey) throw new Error("Platform and API key are required");

    // Verify API key based on platform
    if (platform === "whop") {
      const res = await fetch("https://api.whop.com/api/v5/company", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) throw new Error("Invalid Whop API key");
    } else if (platform === "payhip") {
      // Payhip API verification
      const res = await fetch("https://payhip.com/api/v1/products", {
        headers: { "payhip-api-key": apiKey },
      });
      if (!res.ok) throw new Error("Invalid Payhip API key");
    } else {
      throw new Error("Unsupported platform");
    }

    // Use SERVICE ROLE for upsert (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: upsertError } = await supabaseAdmin
      .from("platform_connections")
      .upsert({
        user_id: user.id,
        platform,
        api_key_encrypted: apiKey,
        status: "connected",
        connected_at: new Date().toISOString(),
      }, { onConflict: "user_id,platform" });

    if (upsertError) throw upsertError;

    console.log(`✅ ${platform} connected for user ${user.id}`);

    return new Response(
      JSON.stringify({ success: true, message: "Connected successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("analytics-connect error:", msg);

    return new Response(
      JSON.stringify({ error: msg }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
