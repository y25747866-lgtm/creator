import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  sendMagicLink: (email: string, redirectPath?: string) => Promise<{ error: { message: string } | null }>;
  signOut: () => Promise<{ error: { message: string } | null }>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  sendMagicLink: async () => ({ error: { message: "Authentication is unavailable." } }),
  signOut: async () => ({ error: null }),
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({ user: null, session: null, loading: true });

  useEffect(() => {
    let mounted = true;
    let authEventObserved = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      authEventObserved = true;
      if (!mounted) return;
      setAuthState({ user: session?.user ?? null, session, loading: false });
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted || authEventObserved) return;
      setAuthState({ user: session?.user ?? null, session, loading: false });
    }).catch(() => {
      if (!mounted || authEventObserved) return;
      setAuthState({ user: null, session: null, loading: false });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    ...authState,
    sendMagicLink: async (email, redirectPath = "/dashboard") => {
      const callbackUrl = `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectPath)}`;
      const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: callbackUrl } });
      return { error };
    },
    signOut: async () => {
      const { error } = await supabase.auth.signOut();
      return { error };
    },
  }), [authState]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
