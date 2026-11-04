import { supabase } from "@/integrations/supabase/client";

export async function generateEbook(title: string) {
  const { data, error } = await supabase.functions.invoke("generate-ebook", {
    body: { title },
  });
  if (error) throw error;
  return data;
}
