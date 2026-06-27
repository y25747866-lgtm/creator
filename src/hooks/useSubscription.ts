import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  type PlanType,
  normalizePlanType,
  isPaidPlan,
  isSubscriptionActive,
  formatExpirationDate,
} from "@/lib/subscription";

interface Subscription {
  id: string;
  plan: string | null;
  plan_type?: string; // For backward compatibility
  status: string | null;
  started_at: string | null;
  expires_at: string | null;
  start_date: string | null;
  end_date: string | null;
  whop_order_id: string | null;
  whop_user_id: string | null;
}

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        console.error("❌ Fetch error:", fetchError);
        setSubscription(null);
        setError("Failed to fetch subscription");
        return;
      }

      if (data) {
        // Check if subscription has expired
        const now = new Date();
        const endDate = data.end_date ? new Date(data.end_date) : null;
        const expiresAt = data.expires_at ? new Date(data.expires_at) : null;

        const isExpired =
          (endDate && endDate < now) || (expiresAt && expiresAt < now);

        if (isExpired && data.status === "active") {
          // Auto-update status to expired
          const { error: updateErr } = await supabase
            .from("subscriptions")
            .update({ status: "expired" })
            .eq("id", data.id);
          if (updateErr) console.error("Failed to update expired status:", updateErr);

          // Update local state
          data.status = "expired";
        }

        setSubscription(data);
        setError(null);
      } else {
        setSubscription(null);
        setError(null);
      }
    } catch (err) {
      console.error("❌ Unexpected error:", err);
      setSubscription(null);
      setError("Unexpected error fetching subscription");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchSubscription();

    // Set up real-time subscription updates
    if (!user) return;

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
          console.log("📡 Subscription updated, refetching...");
          void fetchSubscription();
        }
      )
      .subscribe();

    return () => {
      void channel.unsubscribe();
    };
  }, [user, fetchSubscription]);

  // Use new 'plan' column if available, fallback to 'plan_type'
  const planValue = subscription?.plan || subscription?.plan_type;
  const planType: PlanType = normalizePlanType(planValue);
  const hasActiveSubscription = isSubscriptionActive(subscription);
  const hasPaidSubscription = hasActiveSubscription && isPaidPlan(planType);

  // Get expiration date for display
  const expirationDate = formatExpirationDate(
    subscription?.expires_at,
    subscription?.end_date
  );

  return {
    subscription,
    planType,
    hasActiveSubscription,
    hasPaidSubscription,
    isFreePlan: planType === "free",
    isCreatorPlan: planType === "creator",
    isProPlan: planType === "pro",
    loading,
    error,
    expirationDate,
    refetch: fetchSubscription,
  };
}
