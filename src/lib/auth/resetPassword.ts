import { supabase } from "@/integrations/supabase/client";

export async function resetPassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) throw error;
}
