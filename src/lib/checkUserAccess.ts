import { supabase } from "@/integrations/supabase/client";

export interface UserAccessResult {
  hasAccess: boolean;
  planType: "free" | "creator" | "pro";
  subscription?: {
    id: string;
    user_id: string;
    plan: string | null;
    status: string | null;
    start_date: string | null;
    end_date: string | null;
    started_at: string | null;
    expires_at: string | null;
  };
  reason?: string;
}

/**
 * Check if a user has active subscription access.
 * Only allows access if:
 * - status = 'active'
 * - end_date > now() (or end_date is null for lifetime)
 * - expires_at > now() (or expires_at is null for lifetime)
 */
export async function checkUserAccess(): Promise<UserAccessResult> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        hasAccess: false,
        planType: "free",
        reason: "User not authenticated",
      };
    }

    const { data: subscription, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("❌ Error fetching subscription:", error);
      return {
        hasAccess: false,
        planType: "free",
        reason: "Failed to fetch subscription",
      };
    }

    if (!subscription) {
      return {
        hasAccess: false,
        planType: "free",
        reason: "No active subscription found",
      };
    }

    // Check if subscription has expired using both end_date and expires_at
    const now = new Date();
    const endDate = subscription.end_date
      ? new Date(subscription.end_date)
      : null;
    const expiresAt = subscription.expires_at
      ? new Date(subscription.expires_at)
      : null;

    const isExpired =
      (endDate && endDate < now) || (expiresAt && expiresAt < now);

    if (isExpired) {
      // Auto-update status to expired
      await supabase
        .from("subscriptions")
        .update({ status: "expired" })
        .eq("id", subscription.id)
        .catch((err) => console.error("Failed to update expired status:", err));

      return {
        hasAccess: false,
        planType: "free",
        reason: "Subscription has expired",
      };
    }

    // Normalize plan type
    const planType = normalizePlanType(subscription.plan);

    return {
      hasAccess: true,
      planType,
      subscription,
    };
  } catch (err) {
    console.error("❌ Unexpected error in checkUserAccess:", err);
    return {
      hasAccess: false,
      planType: "free",
      reason: "Unexpected error",
    };
  }
}

/**
 * Normalize plan type from database value
 */
function normalizePlanType(
  plan?: string | null
): "free" | "creator" | "pro" {
  if (!plan) return "free";

  const normalized = plan.trim().toLowerCase();

  // Handle both old plan_type values and new plan values
  if (normalized === "pro") return "pro";
  if (normalized === "creator") return "creator";
  if (normalized === "monthly") return "creator";
  if (normalized === "annual") return "creator";

  return "free";
}

/**
 * Check if user has access to a specific feature based on their plan
 */
export async function checkFeatureAccess(
  featureName: string
): Promise<boolean> {
  const access = await checkUserAccess();

  // If subscription is expired or inactive, deny access to premium features
  if (!access.hasAccess) {
    // Only allow free features if they don't have an active subscription
    const freeFeatures = ["basic_ebook_generation", "basic_marketing"];
    return freeFeatures.includes(featureName);
  }

  // Define feature access by plan
  const featureMatrix: Record<string, string[]> = {
    free: ["basic_ebook_generation", "basic_marketing"],
    creator: [
      "basic_ebook_generation",
      "basic_marketing",
      "advanced_ebook_generation",
      "analytics",
      "sales_page_builder",
    ],
    pro: [
      "basic_ebook_generation",
      "basic_marketing",
      "advanced_ebook_generation",
      "analytics",
      "sales_page_builder",
      "pro_analytics",
      "api_access",
      "custom_branding",
    ],
  };

  const allowedFeatures = featureMatrix[access.planType] || [];
  return allowedFeatures.includes(featureName);
}
