import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const POLL_MS = 2500;
const TIMEOUT_MS = 60_000;

const WhopSuccess = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [status, setStatus] = useState<"polling" | "active" | "timeout">("polling");

  // If not logged in → redirect to email login with return URL
  if (!authLoading && !user) {
    const redirect = encodeURIComponent("/whop/success");
    return <Navigate to={`/auth?redirect=${redirect}`} replace />;
  }

  useEffect(() => {
    if (authLoading || !user) return;

    let cancelled = false;
    const startedAt = Date.now();

    const checkSubscription = async () => {
      try {
        // Query subscription - backend webhook is source of truth
        const { data, error } = await supabase
          .from("subscriptions")
          .select("id, status, expires_at")
          .eq("user_id", user.id)
          .eq("status", "active")
          .gt("expires_at", new Date().toISOString())
          .limit(1);

        if (cancelled) return;
        
        if (error) {
          console.error("Error checking subscription:", error);
          return;
        }

        if (data && data.length > 0) {
          setStatus("active");
          // Small delay to show success state before redirect
          setTimeout(() => {
            if (!cancelled) {
              navigate("/dashboard", { replace: true });
            }
          }, 1500);
          return;
        }

        // Check timeout
        if (Date.now() - startedAt >= TIMEOUT_MS) {
          setStatus("timeout");
        }
      } catch (err) {
        console.error("Subscription check error:", err);
      }
    };

    // Run immediately, then poll
    void checkSubscription();
    const intervalId = window.setInterval(() => {
      if (status === "polling") {
        void checkSubscription();
      }
    }, POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [authLoading, user, navigate, status]);

  // While auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="max-w-md w-full text-center space-y-6">
        {status === "polling" && (
          <>
            <div className="flex items-center justify-center">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
            <h1 className="text-2xl font-semibold">Activating your access…</h1>
            <p className="text-muted-foreground">
              Please wait while we confirm your payment. This usually takes a few seconds.
            </p>
          </>
        )}

        {status === "active" && (
          <>
            <div className="flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <h1 className="text-2xl font-semibold text-green-500">Access Activated!</h1>
            <p className="text-muted-foreground">
              Redirecting you to the dashboard…
            </p>
          </>
        )}

        {status === "timeout" && (
          <>
            <div className="flex items-center justify-center">
              <AlertCircle className="w-12 h-12 text-yellow-500" />
            </div>
            <h1 className="text-2xl font-semibold">Taking longer than expected</h1>
            <p className="text-muted-foreground">
              Your payment was received. If access does not activate within a few minutes, please contact support.
            </p>
            <div className="flex flex-col gap-3 pt-4">
              <Button 
                onClick={() => {
                  setStatus("polling");
                }}
                variant="default"
              >
                Check Again
              </Button>
              <Button 
                onClick={() => navigate("/dashboard")}
                variant="outline"
              >
                Go to Dashboard
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WhopSuccess;
