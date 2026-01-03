import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface Subscription {
  id: string;
  user_id: string;
  plan_type: "monthly" | "annual";
  status: "active" | "cancelled" | "expired";
  whop_order_id: string | null;
  started_at: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

interface SubscriptionState {
  subscription: Subscription | null;
  hasActiveSubscription: boolean;
  loading: boolean;
}

export function useSubscription() {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    subscription: null,
    hasActiveSubscription: false,
    loading: true,
  });

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setState({
        subscription: null,
        hasActiveSubscription: false,
        loading: false,
      });
      return;
    }

    const fetchSubscription = async () => {
      try {
        const { data, error } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle();

        if (error) {
          console.error("Error fetching subscription:", error);
          setState({
            subscription: null,
            hasActiveSubscription: false,
            loading: false,
          });
          return;
        }

        const isActive = data && 
          data.status === "active" && 
          (!data.expires_at || new Date(data.expires_at) > new Date());

        setState({
          subscription: data as Subscription | null,
          hasActiveSubscription: !!isActive,
          loading: false,
        });
      } catch (err) {
        console.error("Error in subscription check:", err);
        setState({
          subscription: null,
          hasActiveSubscription: false,
          loading: false,
        });
      }
    };

    fetchSubscription();
  }, [user, authLoading]);

  return state;
}
