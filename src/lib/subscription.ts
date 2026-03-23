export type PlanType = "free" | "creator" | "pro";

type SubscriptionStatus = "active" | "cancelled" | "expired";

const PLAN_ALIASES: Record<string, PlanType> = {
  free: "free",
  creator: "creator",
  pro: "pro",
  monthly: "creator",
  annual: "creator",
};

/**
 * Normalize plan type from database value
 * Handles both old plan_type and new plan columns
 */
export function normalizePlanType(planType?: string | null): PlanType {
  if (!planType) return "free";
  const normalized = planType.trim().toLowerCase();
  return PLAN_ALIASES[normalized] ?? "free";
}

/**
 * Normalize subscription status
 */
export function normalizeSubscriptionStatus(
  status?: string | null
): SubscriptionStatus {
  if (!status) return "cancelled";
  const normalized = status.trim().toLowerCase();

  if (normalized === "active") return "active";
  if (normalized === "expired") return "expired";
  if (normalized === "cancelled" || normalized === "canceled")
    return "cancelled";

  return "cancelled";
}

/**
 * Check if subscription is active
 * Validates both status and expiration dates
 */
export function isSubscriptionActive(
  subscription?: {
    status?: string | null;
    expires_at?: string | null;
    end_date?: string | null;
  } | null
): boolean {
  if (!subscription) return false;

  // Check status
  if (normalizeSubscriptionStatus(subscription.status) !== "active") {
    return false;
  }

  const now = new Date();

  // Check end_date (new column)
  if (subscription.end_date) {
    const endDate = new Date(subscription.end_date);
    if (endDate < now) {
      return false;
    }
  }

  // Check expires_at (old column for backward compatibility)
  if (subscription.expires_at) {
    const expiresAt = new Date(subscription.expires_at);
    if (expiresAt < now) {
      return false;
    }
  }

  return true;
}

/**
 * Check if plan is a paid plan
 */
export function isPaidPlan(planType: PlanType): boolean {
  return planType === "creator" || planType === "pro";
}

/**
 * Get plan display name
 */
export function getPlanDisplayName(planType: PlanType): string {
  const displayNames: Record<PlanType, string> = {
    free: "Free",
    creator: "Creator",
    pro: "Pro",
  };
  return displayNames[planType];
}

/**
 * Get plan price
 */
export function getPlanPrice(planType: PlanType): string {
  const prices: Record<PlanType, string> = {
    free: "Free",
    creator: "$19/month",
    pro: "$39/month",
  };
  return prices[planType];
}

/**
 * Format expiration date for display
 */
export function formatExpirationDate(
  expiresAt?: string | null,
  endDate?: string | null
): string {
  const dateString = endDate || expiresAt;
  if (!dateString) return "N/A";

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "N/A";
  }
}
