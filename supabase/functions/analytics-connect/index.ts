import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAccess, corsHeaders, errorResponse } from "../_shared/validation.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ✅ STRICT SUBSCRIPTION ENFORCEMENT
    const access = await verifyAccess(req);
    if (!access.authorized) {
      return errorResponse(access.error || "Unauthorized", 401);
    }

    const authHeader = req.headers.get("Authorization");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("User not found after verification");

    const body = await req.json();
    const { platform, apiKey, action } = body;

    // Handle disconnect
    if (action === "disconnect") {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      
      const { error: deleteError } = await supabaseAdmin
        .from("platform_connections")
        .delete()
        .eq("user_id", user.id)
        .eq("platform", platform);

      if (deleteError) throw deleteError;

      console.log(`✅ ${platform} disconnected for user ${user.id}`);

      return new Response(
        JSON.stringify({ success: true, message: "Disconnected" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!platform || !apiKey) throw new Error("Platform and API key are required");
    if (typeof platform !== 'string' || typeof apiKey !== 'string') throw new Error("Invalid platform or API key format");

    console.log(`🔗 Verifying ${platform} API key...`);

    // Verify API key based on platform
    if (platform === "whop") {
      const res = await fetch("https://api.whop.com/api/v5/company", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error("❌ Whop API verification failed:", res.status, errText);
        throw new Error("Invalid Whop API key. Please check your API key and try again.");
      }
      console.log("✅ Whop API key verified");
    } else if (platform === "payhip") {
      const res = await fetch("https://payhip.com/api/v1/product/list", {
        headers: { "payhip-api-key": apiKey },
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error("❌ Payhip API verification failed:", res.status, errText);
        throw new Error("Invalid Payhip API key. Please check your API key and try again.");
      }
      console.log("✅ Payhip API key verified");
    } else {
      throw new Error("Unsupported platform. Only 'whop' and 'payhip' are supported.");
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

    if (upsertError) {
      console.error("❌ Upsert error:", upsertError);
      throw upsertError;
    }

    console.log(`✅ ${platform} connected for user ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${platform} connected successfully! Your real-time data is now available to the AI Assistant.` 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("❌ analytics-connect error:", msg);
    return errorResponse(msg, 400);
  }
});
