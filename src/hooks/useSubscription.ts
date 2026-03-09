import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  type PlanType,
  normalizePlanType,
  isPaidPlan,
  isSubscriptionActive,
} from "@/lib/subscription";

interface Subscription {
  id: string;
  plan_type: string;
  status: string;
  started_at: string;
  expires_at: string | null;
  whop_order_id: string | null;
  whop_user_id: string | null;
}

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    console.log("🔍 RAW SUBSCRIPTION DATA:", data, "error:", error);

    if (error) {
      console.error("❌ Fetch error:", error);
      setSubscription(null);
      setLoading(false);
      return;
    }

    if (data) {
      console.log("✅ PLAN FOUND IN DB:", data.plan_type);
      setSubscription(data);
    } else {
      console.log("⚠️ No row in subscriptions table");
      setSubscription(null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void fetchSubscription();
  }, [user, fetchSubscription]);

  // Use YOUR original functions (exactly as you wrote them)
  const planType: PlanType = normalizePlanType(subscription?.plan_type);
  const hasActiveSubscription = isSubscriptionActive(subscription);
  const hasPaidSubscription = hasActiveSubscription && isPaidPlan(planType);

  return {
    subscription,
    planType,
    hasActiveSubscription,
    hasPaidSubscription,
    isFreePlan: planType === "free",
    isCreatorPlan: planType === "creator",
    isProPlan: planType === "pro",
    loading,
  };
}
