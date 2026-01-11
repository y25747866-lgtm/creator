import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { checkAccess } from "@/lib/checkAccess";
import { Button } from "@/components/ui/button";

type Status = "checking" | "active" | "timeout";

const POLL_INTERVAL_MS = 1000;
const MAX_TRIES = 10;

const WhopSuccess = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("checking");
  const triesRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const interval = setInterval(async () => {
      if (cancelled) return;

      triesRef.current++;

      const res = await checkAccess();

      if (cancelled) return;

      if (res.allowed) {
        clearInterval(interval);
        setStatus("active");
        setTimeout(() => {
          if (!cancelled) {
            navigate("/dashboard", { replace: true });
          }
        }, 800);
        return;
      }

      if (triesRef.current >= MAX_TRIES) {
        clearInterval(interval);
        setStatus("timeout");
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [navigate]);


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
