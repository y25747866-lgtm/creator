import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    console.log("AuthCallback mounted – checking session...");

    const handleCallback = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log("getSession result:", { session, error });

        if (error) {
          console.error("getSession error:", error.message);
          navigate("/auth?error=session_error");
          return;
        }

        if (session) {
          console.log("Session found – redirecting to dashboard");
          navigate("/dashboard");
          return;
        }

        // Listen if exchange is async
        const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
          console.log("Auth state changed:", event, newSession ? "session present" : "no session");
          if (event === "SIGNED_IN" && newSession) {
            navigate("/dashboard");
          }
        });

        return () => listener.subscription.unsubscribe();
      } catch (err) {
        console.error("Callback error:", err);
        navigate("/auth?error=callback_failed");
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg font-medium">Completing sign in...</p>
      </div>
    </div>
  );
    }
