import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      try {
        const { data, error } =
          await supabase.auth.exchangeCodeForSession(window.location.href);

        if (error) {
          console.error("Exchange error:", error);
          navigate("/auth"); // fallback to login
          return;
        }

        if (data.session) {
          navigate("/dashboard"); // logged in, redirect
        } else {
          navigate("/auth"); // fallback
        }
      } catch (err) {
        console.error("Callback error:", err);
        navigate("/auth");
      }
    };

    run();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-lg font-medium">Completing sign in...</p>
    </div>
  );
            }
