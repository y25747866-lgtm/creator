import { useAuth } from "./useAuth";

export function useSubscription() {
  const { user } = useAuth();

  // PERMANENT FULL PRO ACCESS FOR YOU
  // No more view-only mode, no limits, full features always
  return {
    hasActiveSubscription: true,
    loading: false,
    subscription: {
      plan_type: "pro",
      status: "active"
    }
  };
}
