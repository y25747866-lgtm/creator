import { useState, useEffect, useCallback } from "react";
import { useSubscription } from "./useSubscription";

const TRIAL_DURATION_MS = 10 * 60 * 1000; // 10 minutes
const SESSION_START_KEY = "nexora_trial_start";

export function useFreeTrial() {
  const { hasActiveSubscription, loading: subLoading } = useSubscription();
  const [expired, setExpired] = useState(false);
  const [remainingMs, setRemainingMs] = useState(TRIAL_DURATION_MS);

  const isFreeUser = !subLoading && !hasActiveSubscription;

  useEffect(() => {
    if (subLoading || hasActiveSubscription) return;

    // Set session start if not already set
    let start = Number(sessionStorage.getItem(SESSION_START_KEY));
    if (!start) {
      start = Date.now();
      sessionStorage.setItem(SESSION_START_KEY, String(start));
    }

    const tick = () => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, TRIAL_DURATION_MS - elapsed);
      setRemainingMs(remaining);
      if (remaining <= 0) {
        setExpired(true);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [subLoading, hasActiveSubscription]);

  const remainingMinutes = Math.ceil(remainingMs / 60000);
  const remainingFormatted = `${Math.floor(remainingMs / 60000)}:${String(Math.floor((remainingMs % 60000) / 1000)).padStart(2, "0")}`;

  return {
    isFreeUser,
    expired,
    remainingMs,
    remainingMinutes,
    remainingFormatted,
    loading: subLoading,
  };
}
