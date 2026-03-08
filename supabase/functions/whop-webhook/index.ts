import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, webhook-id, webhook-signature, webhook-timestamp",
};

type SubscriptionPlan = "creator" | "pro";

function decodeBase64ToArrayBuffer(base64Value: string): ArrayBuffer {
  const decoded = atob(base64Value);
  const bytes = new Uint8Array(decoded.length);

  for (let i = 0; i < decoded.length; i++) {
    bytes[i] = decoded.charCodeAt(i);
  }

  return bytes.buffer;
}

function resolveWebhookSecretKey(secret: string): string | ArrayBuffer {
  const trimmed = secret.trim();

  // Whop standard format: whsec_<base64>
  if (trimmed.startsWith("whsec_")) {
    return decodeBase64ToArrayBuffer(trimmed.slice(6));
  }

  // Backwards compatibility for plain/base64 strings
  try {
    return decodeBase64ToArrayBuffer(trimmed);
  } catch {
    return trimmed;
  }
}

function verifyWhopSignature(
  rawBody: string,
  headers: Headers,
  secret: string,
): boolean {
  try {
    const msgId = headers.get("webhook-id");
    const timestamp = headers.get("webhook-timestamp");
    const receivedSig = headers.get("webhook-signature");

    if (!msgId || !timestamp || !receivedSig) {
      console.error("Missing webhook signature headers");
      return false;
    }

    // Tolerance: reject if timestamp older than 5 minutes
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parseInt(timestamp, 10)) > 300) {
      console.error("Webhook timestamp too old");
      return false;
    }

    const key = resolveWebhookSecretKey(secret);
    const toSign = `${msgId}.${timestamp}.${rawBody}`;
    const hmac = createHmac("sha256", key);
    hmac.update(toSign);
    const expectedSig = `v1,${hmac.digest("base64")}`;

    // Whop may send multiple signatures separated by space
    const signatures = receivedSig.split(" ");
    return signatures.some((sig) => sig === expectedSig);
  } catch (err) {
    console.error("Signature verification error:", err);
    return false;
  }
}

function resolvePlanType(data: any): SubscriptionPlan {
  const planId = data?.plan?.id || data?.product?.id || "";
  const planName = `${data?.plan?.name || ""} ${data?.product?.name || ""}`.toLowerCase();

  if (planId === "plan_PFB3YG5Pyzlme" || planName.includes("pro")) {
    return "pro";
  }

  return "creator";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const webhookSecret = Deno.env.get("WHOP_WEBHOOK_SECRET");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const rawBody = await req.text();

    // Verify signature if secret is configured
    if (webhookSecret) {
      if (!verifyWhopSignature(rawBody, req.headers, webhookSecret)) {
        console.error("Webhook signature verification failed");
        return new Response(
          JSON.stringify({ error: "Invalid webhook signature" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      console.log("Webhook signature verified");
    } else {
      console.warn("WHOP_WEBHOOK_SECRET not configured – skipping verification");
    }

    const body = JSON.parse(rawBody);
    const action = body.action || body.type;
    const data = body.data;

    console.log("Whop webhook received:", JSON.stringify({ action }));

    // ── Activation ──────────────────────────────────────────────
    if (action === "membership.went_valid" || action === "payment.succeeded") {
      const email = data?.user?.email || data?.email;

      if (!email) {
        return new Response(
          JSON.stringify({ error: "No email in payload" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const planType = resolvePlanType(data);
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const whopUserId = data?.user?.id || data?.user_id || null;

      // Look up user
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", email)
        .maybeSingle();

      if (profileError || !profile) {
        console.error("User not found for email:", email);
        return new Response(
          JSON.stringify({ error: "User not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { error: subError } = await supabase
        .from("subscriptions")
        .upsert(
          {
            user_id: profile.user_id,
            plan_type: planType,
            status: "active",
            whop_order_id: data?.id || null,
            whop_user_id: whopUserId,
            started_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
          },
          { onConflict: "user_id" },
        );

      if (subError) {
        console.error("Subscription upsert failed:", subError);
        return new Response(
          JSON.stringify({ error: "Failed to update subscription" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      console.log("Subscription activated:", email, planType);
      return new Response(
        JSON.stringify({ success: true, message: "Subscription activated" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Cancellation ────────────────────────────────────────────
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
            .update({ status: "cancelled", expires_at: new Date().toISOString() })
            .eq("user_id", profile.user_id);

          console.log("Subscription cancelled:", email);
        }
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Unknown action ──────────────────────────────────────────
    return new Response(
      JSON.stringify({ message: "Webhook received" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

