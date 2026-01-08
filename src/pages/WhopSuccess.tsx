import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const POLL_MS = 2500;
const TIMEOUT_MS = 60_000;

const WhopSuccess = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [isActive, setIsActive] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  const nowIso = useMemo(() => new Date().toISOString(), []);

  // If not logged in → redirect to email login
  if (!authLoading && !user) {
    const redirect = encodeURIComponent("/whop/success");
    return <Navigate to={`/auth?redirect=${redirect}`} replace />;
  }

  useEffect(() => {
    if (authLoading || !user) return;

    let cancelled = false;
    const startedAt = Date.now();

    const check = async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("id,status,expires_at")
        .eq("user_id", user.id)
        .eq("status", "active")
        // STRICT: expires_at must be > now (no NULL lifetime here)
        .gt("expires_at", new Date().toISOString())
        .limit(1);

      if (cancelled) return;
      if (error) return;

      if (data && data.length > 0) {
        setIsActive(true);
        navigate("/dashboard", { replace: true });
        return;
      }

      if (Date.now() - startedAt >= TIMEOUT_MS) {
        setTimedOut(true);
      }
    };

    // Run immediately, then poll.
    void check();
    const id = window.setInterval(() => void check(), POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [authLoading, navigate, user]);

  // While auth is loading, show a minimal loading state.
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // If logged in: do NOT block immediately; keep user here while webhook processes.
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        <h1 className="text-2xl font-semibold">Activating your access…</h1>
        <p className="text-muted-foreground">Please wait.</p>

        {timedOut && !isActive && (
          <p className="text-muted-foreground">
            Payment received. If access does not activate shortly, contact support.
          </p>
        )}

        {/* Used only for debugging/QA; not shown unless needed */}
        <p className="sr-only">Initial timestamp: {nowIso}</p>
      </div>
    </div>
  );
};

export default WhopSuccess;
