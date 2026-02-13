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
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: "https://nexoraos.vercel.app/auth/callback",
    },
  });

  if (error) throw error;
                                                        }
