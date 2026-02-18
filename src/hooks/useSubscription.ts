import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useSubscription() {
  const { user, loading: authLoading } = useAuth();
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setHasActiveSubscription(false);
      setLoading(false);
      return;
    }

    const check = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("subscriptions")
          .select("plan_type, status, expires_at")
          .eq("user_id", user.id)
          .maybeSingle();

        const plan = data?.plan_type?.toLowerCase() || "";
        const status = data?.status?.toLowerCase() || "";

        const isActive = 
          status === "active" ||
          plan === "free" ||
          plan === "pro" ||
          plan === "creator" ||
          plan.includes("pro") ||
          plan.includes("creator") ||
          (data?.expires_at && new Date(data.expires_at) > new Date());

        console.log("Subscription final check:", {
          plan_type: data?.plan_type,
          status: data?.status,
          expires_at: data?.expires_at,
          isActive
        });

        setHasActiveSubscription(isActive);
      } catch (err) {
        console.error("Check error:", err);
        setHasActiveSubscription(false);
      } finally {
        setLoading(false);
      }
    };

    check();
  }, [user, authLoading]);

  return { hasActiveSubscription, loading };
    }
