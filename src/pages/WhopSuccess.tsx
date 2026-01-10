import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const WhopSuccess = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<"checking" | "active" | "no-subscription">("checking");

  useEffect(() => {
    if (authLoading || !user) return;

    let cancelled = false;

    const checkSubscription = async () => {
      try {
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
          setStatus("no-subscription");
          return;
        }

        // No active subscription found - redirect to pricing
        if (!data || data.length === 0) {
          setStatus("no-subscription");
          return;
        }

        // Active subscription found - show success and redirect
        setStatus("active");
        setTimeout(() => {
          if (!cancelled) {
            navigate("/dashboard", { replace: true });
          }
        }, 1500);
      } catch (err) {
        console.error("Subscription check error:", err);
        setStatus("no-subscription");
      }
    };

    void checkSubscription();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, navigate]);

  // Auth loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in - redirect to pricing
  if (!user) {
    return <Navigate to="/pricing" replace />;
  }

  // No subscription - redirect to pricing
  if (status === "no-subscription") {
    return <Navigate to="/pricing" replace />;
  }

  // Checking subscription status
  if (status === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex items-center justify-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
          </div>
          <h1 className="text-2xl font-semibold">Verifying access…</h1>
          <p className="text-muted-foreground">
            Please wait while we check your account status.
          </p>
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
