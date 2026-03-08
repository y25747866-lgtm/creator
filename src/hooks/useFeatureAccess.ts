import { useState, useEffect, useCallback } from "react";
import { useSubscription } from "./useSubscription";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";

type Feature = "ebook_generator" | "marketing_studio" | "sales_page_builder" | "downloads" | "ai_assistant" | "analytics";

const FREE_DAILY_LIMITS: Record<string, number> = {
  ebook_generator: 1,
  marketing_studio: 1,
  sales_page_builder: 1,
};

export function useFeatureAccess() {
  const { user } = useAuth();
  const { planType, isFreePlan, hasPaidSubscription, loading: subLoading } = useSubscription();
  const { toast } = useToast();
  const [dailyUsage, setDailyUsage] = useState<Record<string, number>>({});
  const [usageLoading, setUsageLoading] = useState(false);

  // Fetch today's usage for free plan users
  useEffect(() => {
    if (!user || !isFreePlan) return;
    const fetchUsage = async () => {
      setUsageLoading(true);
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("daily_usage")
        .select("feature, count")
        .eq("user_id", user.id)
        .eq("used_at", today);
      const usage: Record<string, number> = {};
      data?.forEach((row: any) => { usage[row.feature] = row.count; });
      setDailyUsage(usage);
      setUsageLoading(false);
    };
    fetchUsage();
  }, [user, isFreePlan]);

  const recordUsage = useCallback(async (feature: Feature) => {
    if (!user || !isFreePlan) return true;
    const today = new Date().toISOString().split("T")[0];
    const currentCount = dailyUsage[feature] || 0;
    const limit = FREE_DAILY_LIMITS[feature];

    if (limit && currentCount >= limit) {
      toast({
        title: "Free plan limit reached",
        description: "Upgrade to continue generating.",
        variant: "destructive",
      });
      return false;
    }

    // Upsert usage count
    const { error } = await supabase
      .from("daily_usage")
      .upsert(
        { user_id: user.id, feature, used_at: today, count: currentCount + 1 },
        { onConflict: "user_id,feature,used_at" }
      );

    if (!error) {
      setDailyUsage((prev) => ({ ...prev, [feature]: currentCount + 1 }));
    }
    return true;
  }, [user, isFreePlan, dailyUsage, toast]);

  const canUseFeature = useCallback((feature: Feature): boolean => {
    if (subLoading) return false;
    
    // Downloads require paid plan
    if (feature === "downloads" && isFreePlan) return false;
    
    // AI Assistant requires pro plan
    if (feature === "ai_assistant" && planType !== "pro") return false;

    // Generation features have daily limits on free plan
    if (isFreePlan && FREE_DAILY_LIMITS[feature]) {
      const currentCount = dailyUsage[feature] || 0;
      return currentCount < FREE_DAILY_LIMITS[feature];
    }

    return true;
  }, [subLoading, isFreePlan, planType, dailyUsage]);

  const getRemainingUses = useCallback((feature: Feature): number | null => {
    if (!isFreePlan || !FREE_DAILY_LIMITS[feature]) return null;
    const limit = FREE_DAILY_LIMITS[feature];
    const used = dailyUsage[feature] || 0;
    return Math.max(0, limit - used);
  }, [isFreePlan, dailyUsage]);

  return {
    canUseFeature,
    recordUsage,
    getRemainingUses,
    planType,
    isFreePlan,
    hasPaidSubscription,
    loading: subLoading || usageLoading,
  };
}
