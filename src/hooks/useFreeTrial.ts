import { useSubscription } from "./useSubscription";

export function useFreeTrial() {
  const { hasActiveSubscription, loading: subLoading, subscription } = useSubscription();

  const isFreeUser = !subLoading && (!hasActiveSubscription || subscription?.plan_type === "free");

  return {
    isFreeUser,
    expired: false,
    remainingMs: Infinity,
    remainingMinutes: Infinity,
    remainingFormatted: "∞",
    loading: subLoading,
  };
}
