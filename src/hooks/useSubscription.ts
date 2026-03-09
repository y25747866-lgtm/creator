import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";

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

    if (data) {
      console.log("✅ PLAN FOUND:", data.plan_type);
      setSubscription(data);
    } else {
      console.log("⚠️ No subscription row found");
      setSubscription(null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void fetchSubscription();
  }, [user, fetchSubscription]);

  const planType = (subscription?.plan_type || "free").toLowerCase() as "free" | "pro" | "creator";

  return {
    subscription,
    planType,
    hasPaidSubscription: planType === "pro" || planType === "creator",
    isProPlan: planType === "pro",
    isFreePlan: planType === "free",
    loading: false,
  };
}
