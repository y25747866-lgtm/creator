import { useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleLogin = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error(error);
        navigate("/login");
        return;
      }

      if (data.session) {
        navigate("/dashboard");
      } else {
        navigate("/login");
      }
    };

    handleLogin();
  }, []);

  return <div>Signing in...</div>;
        }
