import { supabase } from "@/integrations/supabase/client";

export async function checkAccess(): Promise<{ allowed: boolean }> {
  const { data: session } = await supabase.auth.getSession();

  if (!session.session) return { allowed: false };

  const userId = session.session.user.id;

  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (!data) return { allowed: false };

  return { allowed: true };
}
