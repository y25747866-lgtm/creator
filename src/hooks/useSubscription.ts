import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface Subscription {
  id: string;
  user_id: string;
  plan_type: string;           // "free", "creator", "pro", etc.
  status: string | null;
  whop_order_id?: string | null;
  started_at?: string;
  expires_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export function useSubscription() {
  const { user, loading: authLoading } = useAuth();
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setHasActiveSubscription(false);
      setSubscription(null);
      setLoading(false);
      return;
    }

    const fetchSubscription = async () => {
      try {
        const { data, error } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching subscription:", error);
          setHasActiveSubscription(false);
          setSubscription(null);
          setLoading(false);
          return;
        }

        const sub = data as Subscription | null;

        // FREE ACCESS LOGIC - This is what was missing
        const isActive = sub && (
          sub.plan_type === "free" ||
          sub.status === "active" ||
          (sub.expires_at && new Date(sub.expires_at) > new Date()) ||
          sub.plan_type === "creator" ||
          sub.plan_type === "pro" ||
          sub.plan_type === "Pro"
        );

        console.log("Subscription check:", { 
          plan_type: sub?.plan_type, 
          status: sub?.status, 
          expires_at: sub?.expires_at,
          isActive 
        });

        setSubscription(sub);
        setHasActiveSubscription(!!isActive);
        setLoading(false);
      } catch (err) {
        console.error("Subscription check failed:", err);
        setHasActiveSubscription(false);
        setSubscription(null);
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [user, authLoading]);

  return { 
    hasActiveSubscription, 
    loading, 
    subscription 
  };
}
