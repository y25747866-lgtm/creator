import { useSubscription } from "./useSubscription";

export function useFreeTrial() {
  const { hasPaidSubscription, loading: subLoading, isFreePlan } = useSubscription();

  return {
    isFreeUser: !subLoading && isFreePlan,
    expired: false,
    remainingMs: Infinity,
    remainingMinutes: Infinity,
    remainingFormatted: "∞",
    loading: subLoading,
  };
}
