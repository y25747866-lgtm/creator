import { supabase } from "@/integrations/supabase/client";
import { normalizePlanType } from "@/lib/subscription";

export async function checkAccess() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { hasAccess: false, planType: "free" as const };

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return { hasAccess: false, planType: "free" as const };
  }

  const isStillActive = !data.expires_at || new Date(data.expires_at) > new Date();

  if (!isStillActive) {
    return { hasAccess: false, planType: "free" as const };
  }

  return {
    hasAccess: true,
    planType: normalizePlanType(data.plan_type),
    subscription: data,
  };
}
