import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  type PlanType,
  isPaidPlan,
  normalizePlanType,
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

export type { PlanType };

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

    setLoading(true);

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("subscriptions")
      .select(
        "id, plan_type, status, started_at, expires_at, whop_order_id, whop_user_id"
      )
      .eq("user_id", user.id)
      .eq("status", "active")
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    setSubscription(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    void fetchSubscription();

    const onFocus = () => void fetchSubscription();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void fetchSubscription();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    const channel = supabase
      .channel(`subscriptions:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subscriptions",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void fetchSubscription();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      void supabase.removeChannel(channel);
    };
  }, [user, fetchSubscription]);

  const planType: PlanType = normalizePlanType(subscription?.plan_type);
  const hasActiveSubscription = subscription !== null;
  const hasPaidSubscription = hasActiveSubscription && isPaidPlan(planType);

  return {
    hasActiveSubscription,
    hasPaidSubscription,
    loading,
    subscription,
    planType,
    isFreePlan: planType === "free",
    isCreatorPlan: planType === "creator",
    isProPlan: planType === "pro",
  };
  }
