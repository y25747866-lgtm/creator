import { supabaseExternal } from "./supabaseClient";

export async function signIn(email: string, password: string) {
  const { data, error } = await supabaseExternal.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  if (!data.user.confirmed_at) {
    throw new Error("Email not verified");
  }

  return data.user;
}
