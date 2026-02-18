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

    const checkSubscription = async () => {
      try {
        const { data, error } = await supabase
          .from("subscriptions")
          .select("plan_type, status, expires_at")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Supabase error:", error);
          setHasActiveSubscription(false);
          setLoading(false);
          return;
        }

        const sub = data;

        // SUPER SIMPLE & BULLETPROOF FREE ACCESS LOGIC
        const isActive = !!sub && (
          sub.plan_type?.toLowerCase() === "free" ||
          sub.plan_type?.toLowerCase() === "pro" ||
          sub.plan_type?.toLowerCase() === "creator" ||
          sub.status === "active" ||
          (sub.expires_at && new Date(sub.expires_at) > new Date())
        );

        console.log("✅ Subscription Check Result:", {
          user_id: user.id,
          found: !!sub,
          plan_type: sub?.plan_type,
          status: sub?.status,
          expires_at: sub?.expires_at,
          isActive: isActive
        });

        setHasActiveSubscription(isActive);
        setLoading(false);

      } catch (err) {
        console.error("Subscription hook error:", err);
        setHasActiveSubscription(false);
        setLoading(false);
      }
    };

    checkSubscription();
  }, [user, authLoading]);

  return { 
    hasActiveSubscription, 
    loading 
  };
        }
