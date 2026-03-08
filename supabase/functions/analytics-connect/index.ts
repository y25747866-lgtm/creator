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

    const { platform, apiKey } = await req.json();   // ← your Whop modal sends this

    if (platform !== "whop") throw new Error("Only Whop supported in this modal");

    if (!apiKey) throw new Error("API key is required");

    // Verify with the exact endpoint from your GitHub code
    const res = await fetch("https://api.whop.com/api/v5/company", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) throw new Error("Invalid Whop API key");

    // Use SERVICE ROLE for insert (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: upsertError } = await supabaseAdmin
      .from("platform_connections")
      .upsert({
        user_id: user.id,
        platform: "whop",
        api_key: apiKey,                 // ← matches your table column
        status: "connected",
        connected_at: new Date().toISOString(),
      }, { onConflict: "user_id,platform" });

    if (upsertError) throw upsertError;

    console.log(`✅ Whop connected for user ${user.id}`);

    return new Response(
      JSON.stringify({ success: true, message: "Connected successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("analytics-connect error:", msg);

    return new Response(
      JSON.stringify({ error: msg }),
      { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
