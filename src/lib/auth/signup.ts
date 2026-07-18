import { supabase } from "@/integrations/supabase/client";

export async function signUp(email: string, password: string) {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: "https://nexoraos.vercel.app/auth?mode=login",
    },
  });

  if (error) throw error;
}
