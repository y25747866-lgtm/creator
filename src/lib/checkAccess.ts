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

  const now = new Date();

  // Check both end_date (new column) and expires_at (old column)
  const endDate = data.end_date ? new Date(data.end_date) : null;
  const expiresAt = data.expires_at ? new Date(data.expires_at) : null;

  const isStillActive =
    (!endDate || endDate > now) && (!expiresAt || expiresAt > now);

  if (!isStillActive) {
    // Auto-update status to expired
    const { error: updateErr } = await supabase
      .from("subscriptions")
      .update({ status: "expired" })
      .eq("id", data.id);
    if (updateErr) console.error("Failed to update expired status:", updateErr);

    return { hasAccess: false, planType: "free" as const };
  }

  // Use new 'plan' column if available, fallback to 'plan_type'
  const planValue = data.plan || data.plan_type;

  return {
    hasAccess: true,
    planType: normalizePlanType(planValue),
    subscription: data,
  };
}
