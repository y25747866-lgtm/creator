import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client"; // adjust path
import { Skeleton } from "@/components/ui/skeleton";
export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = new URLSearchParams(location.search).get("redirect") || "/dashboard";

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Explicitly refresh session (helps with Vercel cookie issues)
        const { error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError) {
          console.error("Refresh error:", refreshError.message);
        }

        // Get current session
        const { data: { session: currentSession }, error: getError } = await supabase.auth.getSession();

        if (getError) {
          console.error("Get session error:", getError.message);
          navigate("/auth/signin?error=session_error");
          return;
        }

        if (currentSession) {
          navigate(redirectTo, { replace: true });
          return;
        }

        // Listen for state change (PKCE exchange may be async)
        const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
          if (event === "SIGNED_IN" && newSession) {
            navigate(redirectTo, { replace: true });
          }
        });

        return () => {
          listener.subscription.unsubscribe();
        };
      } catch (err) {
        console.error("Callback handling error:", err instanceof Error ? err.message : "Unknown sign-in callback error");
        navigate("/auth/signin?error=callback_failed");
      }
    };

    handleCallback();
  }, [navigate, redirectTo]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <Skeleton role="status" aria-label="Completing sign in" className="h-24 w-72" />
    </div>
  );
}
