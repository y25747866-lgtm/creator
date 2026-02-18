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
      setLoading(true);

      try {
        const { data, error } = await supabase
          .from("subscriptions")
          .select("plan_type, status, expires_at")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Supabase error:", error.message);
          setHasActiveSubscription(false);
          setLoading(false);
          return;
        }

        const sub = data;

        // SUPER TOLERANT LOGIC – accepts almost anything reasonable
        const planLower = sub?.plan_type?.toLowerCase() || "";
        const isFreeOrPaid = 
          planLower === "free" ||
          planLower === "pro" ||
          planLower === "creator" ||
          planLower.includes("pro") ||
          planLower.includes("creator");

        const isActiveStatus = sub?.status?.toLowerCase() === "active";

        const hasNotExpired = !sub?.expires_at || new Date(sub.expires_at) > new Date();

        const isActive = sub && (isFreeOrPaid || isActiveStatus) && hasNotExpired;

        console.log("FINAL SUBSCRIPTION CHECK:", {
          user_id: user.id,
          found_row: !!sub,
          raw_plan_type: sub?.plan_type,
          normalized_plan: planLower,
          status: sub?.status,
          expires_at: sub?.expires_at,
          isFreeOrPaid,
          isActiveStatus,
          hasNotExpired,
          final_isActive: isActive
        });

        setHasActiveSubscription(isActive || false);
      } catch (err) {
        console.error("Hook crashed:", err);
        setHasActiveSubscription(false);
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
  }, [user, authLoading]);

  return { hasActiveSubscription, loading };
  }
