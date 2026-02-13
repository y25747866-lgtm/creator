import { supabase } from "../supabaseClient";

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  if (!data.user.confirmed_at) {
    throw new Error("Email not verified");
  }

  return data.user;
}


// ✅ ADD THIS FUNCTION FOR GOOGLE LOGIN
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: "https://nexoraos.vercel.app/auth/callback",
    },
  });

  if (error) throw error;
}
