import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, webhook-id, webhook-signature, webhook-timestamp",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const webhookSecret = Deno.env.get("WHOP_WEBHOOK_SECRET");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get raw body for signature verification
    const rawBody = await req.text();
    
    // Verify webhook signature if secret is configured
    if (webhookSecret) {
      try {
        const wh = new Webhook(webhookSecret);
        const headers: Record<string, string> = {};
        req.headers.forEach((value, key) => {
          headers[key] = value;
        });
        wh.verify(rawBody, headers);
        console.log("Webhook signature verified successfully");
      } catch (verifyError) {
        console.error("Webhook signature verification failed:", verifyError);
        return new Response(
          JSON.stringify({ error: "Invalid webhook signature" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      console.warn("WHOP_WEBHOOK_SECRET not configured - skipping signature verification");
    }

    const body = JSON.parse(rawBody);
    
    // Whop webhook payload structure - handle both formats
    // Format 1: { action, data } (legacy)
    // Format 2: { type, data } (standard webhooks)
    const action = body.action || body.type;
    const data = body.data;
    
    console.log("Received Whop webhook:", { action, data });

    if (action === "membership.went_valid" || action === "payment.succeeded") {
      // Extract user email and plan from webhook
      const email = data?.user?.email || data?.email;
      const planId = data?.plan?.id || data?.product?.id;
      
      if (!email) {
        console.error("No email found in webhook payload");
        return new Response(
          JSON.stringify({ error: "No email found" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Determine plan type based on plan ID
      let planType = "monthly";
      if (planId === "plan_xNlBWUTysLURE") {
        planType = "annual";
      }

      // Find user by email in profiles
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", email)
        .maybeSingle();

      if (profileError || !profile) {
        console.error("User not found:", email);
        return new Response(
          JSON.stringify({ error: "User not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Calculate expiration date
      const expiresAt = planType === "annual" 
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // Extract whop_user_id from webhook
      const whopUserId = data?.user?.id || data?.user_id || null;

      // Upsert subscription
      const { error: subError } = await supabase
        .from("subscriptions")
        .upsert({
          user_id: profile.user_id,
          plan_type: planType,
          status: "active",
          whop_order_id: data?.id || null,
          whop_user_id: whopUserId,
          started_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
        }, {
          onConflict: "user_id",
        });

      if (subError) {
        console.error("Error updating subscription:", subError);
        return new Response(
          JSON.stringify({ error: "Failed to update subscription" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Subscription activated for:", email, planType);
      
      return new Response(
        JSON.stringify({ success: true, message: "Subscription activated" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "membership.went_invalid" || action === "membership.cancelled") {
      const email = data?.user?.email || data?.email;
      
      if (email) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("email", email)
          .maybeSingle();

        if (profile) {
          await supabase
            .from("subscriptions")
            .update({ status: "cancelled" })
            .eq("user_id", profile.user_id);
          
          console.log("Subscription cancelled for:", email);
        }
      }
      
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ message: "Webhook received" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
