import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

type Status = "checking" | "active" | "timeout" | "redirect-pricing";

const POLL_INTERVAL_MS = 1000;
const MAX_WAIT_MS = 10000;

const WhopSuccess = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<Status>("checking");
  const pollCount = useRef(0);
  const startTime = useRef<number>(Date.now());

  const checkSubscription = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("id, status, expires_at")
        .eq("user_id", user.id)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .limit(1);

      if (error) {
        console.error("Error checking subscription:", error);
        return false;
      }

      return data && data.length > 0;
    } catch (err) {
      console.error("Subscription check error:", err);
      return false;
    }
  }, [user]);

  useEffect(() => {
    // Wait for auth to load
    if (authLoading) return;

    // Not logged in → redirect to pricing immediately
    if (!user) {
      navigate("/pricing", { replace: true });
      return;
    }

    let cancelled = false;
    startTime.current = Date.now();
    pollCount.current = 0;

    // First, do an immediate check - if no subscription exists at all, redirect immediately
    const initialCheck = async () => {
      const hasActive = await checkSubscription();
      
      if (cancelled) return;
      
      if (hasActive) {
        // Active subscription found → show success briefly, then redirect
        setStatus("active");
        setTimeout(() => {
          if (!cancelled) {
            navigate("/dashboard", { replace: true });
          }
        }, 800);
        return;
      }
      
      // No active subscription on first check - start polling but with shorter initial timeout
      pollCount.current++;
      startPolling();
    };

    const startPolling = () => {
      const poll = async () => {
        if (cancelled) return;

        const hasActive = await checkSubscription();

        if (cancelled) return;

        if (hasActive) {
          // Active subscription found → show success briefly, then redirect
          setStatus("active");
          setTimeout(() => {
            if (!cancelled) {
              navigate("/dashboard", { replace: true });
            }
          }, 800);
          return;
        }

        // Check if we've exceeded timeout
        const elapsed = Date.now() - startTime.current;
        if (elapsed >= MAX_WAIT_MS) {
          // Show timeout message - payment may be processing
          setStatus("timeout");
          return;
        }

        pollCount.current++;

        // Continue polling
        setTimeout(poll, POLL_INTERVAL_MS);
      };

      setTimeout(poll, POLL_INTERVAL_MS);
    };

    void initialCheck();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, navigate, checkSubscription]);

  // Redirect to pricing for cancelled/no-subscription users
  useEffect(() => {
    if (status === "redirect-pricing") {
      navigate("/pricing", { replace: true });
    }
  }, [status, navigate]);

  // Auth loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Checking subscription status (polling)
  if (status === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex items-center justify-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
          </div>
          <h1 className="text-2xl font-semibold">Verifying access…</h1>
          <p className="text-muted-foreground">
            Please wait while we confirm your subscription.
          </p>
        </div>
      </div>
    );
  }

  // Timeout - payment received but subscription not yet active
  if (status === "timeout") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex items-center justify-center">
            <AlertCircle className="w-12 h-12 text-amber-500" />
          </div>
          <h1 className="text-2xl font-semibold">Payment received</h1>
          <p className="text-muted-foreground">
            Access is syncing. Please refresh or contact support if this persists.
          </p>
          <div className="flex flex-col gap-3 pt-4">
            <Button onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate("/pricing", { replace: true })}
            >
              Return to Pricing
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Active subscription - show success before redirect
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex items-center justify-center">
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>
        <h1 className="text-2xl font-semibold text-green-500">Access Verified!</h1>
        <p className="text-muted-foreground">
          Redirecting you to the dashboard…
        </p>
      </div>
    </div>
  );
};

export default WhopSuccess;
