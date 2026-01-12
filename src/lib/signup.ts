import { supabaseExternal } from "./supabaseClient";

export async function signUp(email: string, password: string) {
  const { error } = await supabaseExternal.auth.signUp({
    email,
    password,
  });

  if (error) throw error;
}
