import { supabase } from "../supabaseClient";

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
 * Google Sign In
 */
export async function signInWithGoogle() {
  // Dynamic redirect – works on localhost, preview, production
  const redirectTo = `${window.location.origin}/auth/callback`;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      // Ask Google for refresh token + force consent screen (helps debugging)
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
