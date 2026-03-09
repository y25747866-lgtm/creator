export type PlanType = "free" | "creator" | "pro";

type SubscriptionStatus = "active" | "cancelled" | "expired";

const PLAN_ALIASES: Record<string, PlanType> = {
free: "free",
creator: "creator",
pro: "pro",
monthly: "creator",
annual: "creator",
};

export function normalizePlanType(planType?: string | null): PlanType {
if (!planType) return "free";
const normalized = planType.trim().toLowerCase();
return PLAN_ALIASES[normalized] ?? "free";
}

export function normalizeSubscriptionStatus(status?: string | null): SubscriptionStatus {
if (!status) return "cancelled";
const normalized = status.trim().toLowerCase();

if (normalized === "active") return "active";
if (normalized === "expired") return "expired";
if (normalized === "cancelled" || normalized === "canceled") return "cancelled";

return "cancelled";
}

export function isSubscriptionActive(subscription?: { status?: string | null; expires_at?: string | null } | null): boolean {
if (!subscription) return false;

if (normalizeSubscriptionStatus(subscription.status) !== "active") {
return false;
}

if (!subscription.expires_at) return true;

return new Date(subscription.expires_at) >= new Date();
}

export function isPaidPlan(planType: PlanType): boolean {
return planType === "creator" || planType === "pro";
  }
