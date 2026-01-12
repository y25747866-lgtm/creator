import { supabaseExternal } from "./supabaseClient";

export async function resetPassword(newPassword: string) {
  const { error } = await supabaseExternal.auth.updateUser({
    password: newPassword,
  });

  if (error) throw error;
}
