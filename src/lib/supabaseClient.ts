import { createClient } from "@supabase/supabase-js";

export const supabaseExternal = createClient(
  "https://zprgfzoxlgaxbnnjvvir.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpwcmdmem94bGdheGJubmp2dmlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3Njg3NzksImV4cCI6MjA4MjM0NDc3OX0.UgZ-H3C80vZLmXwzKOiYYJpxWto39BzQuID7N0hp2Ts"
);
