import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client"; // adjust path
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const navigate = useNavigate();

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
          navigate("/auth?error=session_error");
          return;
        }

        if (currentSession) {
          navigate("/dashboard");
          return;
        }

        // Listen for state change (PKCE exchange may be async)
        const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
          if (event === "SIGNED_IN" && newSession) {
            navigate("/dashboard");
          }
        });

        return () => {
          listener.subscription.unsubscribe();
        };
      } catch (err) {
        console.error("Callback handling error:", err instanceof Error ? err.message : "Unknown sign-in callback error");
        navigate("/auth?error=callback_failed");
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6">
        <Loader2 className="h-16 w-16 animate-spin text-white" />
        <h2 className="text-2xl font-semibold tracking-tight">
          Completing sign in...
        </h2>
        <p className="text-muted-foreground">
          Please wait a moment
        </p>
      </div>
    </div>
  );
}
