import { useState, useEffect } from "react";
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

  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    const fetchSubscription = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("subscriptions")
        .select("id, plan_type, status, started_at, expires_at, whop_order_id, whop_user_id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        // Check expiration
        const isExpired = data.expires_at && new Date(data.expires_at) < new Date();
        setSubscription(isExpired ? null : data);
      } else {
        setSubscription(null);
      }
      setLoading(false);
    };

    fetchSubscription();
  }, [user]);

  return {
    hasActiveSubscription: !!subscription,
    loading,
    subscription,
  };
}
