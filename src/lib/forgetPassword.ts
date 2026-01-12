import { supabaseExternal } from "./supabaseClient";

export async function forgetPassword(email: string) {
  const { error } = await supabaseExternal.auth.resetPasswordForEmail(email, {
    redirectTo: "https://nexoraos.vercel.app/reset-password",
  });

  if (error) throw error;
}
