import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});

// Fix 2: Session Inactivity Logout (24 hours)
const INACTIVITY_LIMIT = 24 * 60 * 60 * 1000; // 24 hours in ms

const checkInactivity = () => {
  const lastActive = localStorage.getItem("last_active");
  const now = Date.now();

  if (lastActive && now - parseInt(lastActive) > INACTIVITY_LIMIT) {
    console.log("Session expired due to 24h inactivity. Signing out...");
    localStorage.removeItem("last_active");
    void supabase.auth.signOut().then(() => {
      window.location.href = "/auth";
    });
  } else {
    localStorage.setItem("last_active", now.toString());
  }
};

// Update activity on interactions
if (typeof window !== "undefined") {
  const activityEvents = ["mousedown", "keydown", "touchstart", "scroll"];
  activityEvents.forEach((event) => {
    window.addEventListener(event, () => {
      localStorage.setItem("last_active", Date.now().toString());
    });
  });

  // Check on load and periodically
  checkInactivity();
  setInterval(checkInactivity, 60 * 1000); // Check every minute
}
