import { supabase } from "@/integrations/supabase/client";
import { normalizePlanType } from "@/lib/subscription";

export async function checkAccess() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { hasAccess: false, planType: "free" as const };

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("subscriptions")
    .select("id, plan_type, status, expires_at, user_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .or(`expires_at.is.null,expires_at.gt.${now}`)
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
