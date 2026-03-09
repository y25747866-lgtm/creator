import { supabase } from "@/integrations/supabase/client";
import { isSubscriptionActive, normalizePlanType } from "@/lib/subscription";

export async function checkAccess() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { hasAccess: false, planType: "free" as const };

  const { data, error } = await supabase
    .from("subscriptions")
    .select("id, plan_type, status, expires_at, user_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return { hasAccess: false, planType: "free" as const };
  }

  return {
    hasAccess: true,
    planType: normalizePlanType(data.plan_type),
    subscription: data,
  };
}

