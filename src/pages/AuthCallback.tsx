import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const getDashboardPath = () => {
      const callbackParams = new URLSearchParams(window.location.search);
      let initialQuery = callbackParams.get("initialQuery");
      if (!initialQuery) {
        try {
          initialQuery = window.localStorage.getItem("nexora_initial_build_query");
        } catch {
          initialQuery = null;
        }
      }
      try {
        window.localStorage.removeItem("nexora_initial_build_query");
      } catch {
        // Ignore unavailable browser storage.
      }
      return initialQuery
        ? `/dashboard?query=${encodeURIComponent(initialQuery)}`
        : "/dashboard";
    };

    const handleCallback = async () => {
      try {
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) console.error("Refresh error:", refreshError.message);

        const { data: { session }, error: getError } = await supabase.auth.getSession();
        if (getError) {
          console.error("Get session error:", getError.message);
          navigate("/auth?error=session_error");
          return;
        }

        if (session) {
          navigate(getDashboardPath(), { replace: true });
          return;
        }

        const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
          if (event === "SIGNED_IN" && newSession) {
            navigate(getDashboardPath(), { replace: true });
          }
        });

        return () => listener.subscription.unsubscribe();
      } catch (error) {
        console.error("Callback handling error:", error);
        navigate("/auth?error=callback_failed");
      }
    };

    void handleCallback();
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] text-[#e8e8e8]">
      <div className="flex flex-col items-center gap-5">
        <Loader2 className="h-8 w-8 animate-spin text-[#00e68e]" />
        <h2 className="text-lg font-semibold tracking-tight">Completing sign in…</h2>
        <p className="text-sm text-[#888888]">Taking you to your workspace</p>
      </div>
    </div>
  );
}
