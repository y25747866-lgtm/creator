import { useAuth } from "./useAuth";

export function useSubscription() {
  const { user } = useAuth();

  // =============================================
  // PERMANENT FULL ACCESS FOR YOU (Yesh)
  // You will always have Pro access when you log in
  // Other users will follow normal subscription rules
  // =============================================
  
  const YOUR_USER_ID = "63684a71-cc63-ad96-d96bc03408f1";   // Your Supabase user ID

  const isYou = user?.id === YOUR_USER_ID;

  return {
    hasActiveSubscription: isYou,     // Always true for you
    loading: false,
    subscription: isYou 
      ? { 
          plan_type: "pro", 
          status: "active" 
        } 
      : null
  };
}
