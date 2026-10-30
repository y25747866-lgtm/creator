import { supabase } from "@/integrations/supabase/client";

/**
 * Email + Password Sign In
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  if (!data.user?.email_confirmed_at) {
    throw new Error("Email not verified");
  }

  return data.user;
}

/**
 * Google Sign In. Callers may provide a same-origin callback URL with state to preserve.
 */
export async function signInWithGoogle(callbackUrl?: string) {
  const redirectTo = callbackUrl ?? `${window.location.origin}/auth/callback`;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error) {
    console.error("Google sign-in failed:", error.message, error);
    throw error;
  }
}
