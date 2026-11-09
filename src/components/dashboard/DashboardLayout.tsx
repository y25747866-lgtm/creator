import { ReactNode, createContext, useContext, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { isPaidPlan, isSubscriptionActive, normalizePlanType } from "@/lib/subscription";
import DashboardSidebar from "./DashboardSidebar";

interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (value: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  setCollapsed: () => {},
  mobileOpen: false,
  setMobileOpen: () => {},
});

export const useSidebarState = () => useContext(SidebarContext);
const SIDEBAR_KEY = "nexora_sidebar_collapsed";

export interface DashboardAccessState {
  loading: boolean;
  hasPaidSubscription: boolean;
  analyticsAccess: boolean;
  agentAccess: boolean;
  renewalRequired: boolean;
  isExpired: boolean;
  error: boolean;
}

const DashboardAccessContext = createContext<DashboardAccessState>({
  loading: true,
  hasPaidSubscription: false,
  analyticsAccess: false,
  agentAccess: false,
  renewalRequired: false,
  isExpired: false,
  error: false,
});

export const useDashboardAccess = () => useContext(DashboardAccessContext);

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, loading: authLoading } = useAuth();
  const subscriptionQuery = useQuery({
    queryKey: ["nexora-dashboard-access", user?.id ?? "anonymous"],
    enabled: !authLoading && Boolean(user?.id),
    staleTime: 60_000,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("plan,plan_type,status,end_date,expires_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const accessLoading = authLoading || (Boolean(user?.id) && subscriptionQuery.isLoading);
  const subscription = subscriptionQuery.data;
  const hasActivePlan = Boolean(subscription && isSubscriptionActive(subscription));
  const hasPaidSubscription = Boolean(
    hasActivePlan && isPaidPlan(normalizePlanType(subscription?.plan || subscription?.plan_type)),
  );
  const now = Date.now();
  const isExpired = Boolean(
    subscription && (
      subscription.status === "expired"
      || (subscription.status === "active" && (
        (subscription.end_date && Date.parse(subscription.end_date) < now)
        || (subscription.expires_at && Date.parse(subscription.expires_at) < now)
      ))
    ),
  );
  const dashboardAccess: DashboardAccessState = {
    loading: accessLoading,
    hasPaidSubscription,
    // Keep these gates aligned with the existing paid-plan feature matrix.
    analyticsAccess: hasPaidSubscription,
    agentAccess: hasPaidSubscription,
    renewalRequired: !accessLoading && !subscriptionQuery.isError && !hasPaidSubscription,
    isExpired,
    error: Boolean(subscriptionQuery.isError),
  };
  const [collapsed, setCollapsedState] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();

  const setCollapsed = (value: boolean) => {
    setCollapsedState(value);
    try {
      localStorage.setItem(SIDEBAR_KEY, String(value));
    } catch {
      // Sidebar state remains usable if local storage is unavailable.
    }
  };

  return (
    <DashboardAccessContext.Provider value={dashboardAccess}>
      <SidebarContext.Provider value={{ collapsed, setCollapsed, mobileOpen, setMobileOpen }}>
      <div className="nexora-dashboard min-h-screen bg-[#080A0C] text-[#F0F2F5]">
        {mobileOpen && (
          <button
            type="button"
            aria-label="Close navigation drawer"
            className="fixed inset-0 z-30 cursor-default bg-black/55 backdrop-blur-[2px] md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
        <DashboardSidebar />
        <main className={`relative z-10 flex min-h-screen w-full flex-col transition-[padding] duration-200 ${collapsed ? "md:pl-20" : "md:pl-[280px]"}`}>
          {dashboardAccess.renewalRequired && (
            <div role="status" className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#111318] px-4 py-3 text-sm text-[#D4D4D4] sm:px-6">
              <span>{dashboardAccess.isExpired ? "Your plan has expired — Renew to continue" : "A paid plan is required — Choose a plan to continue"}</span>
              <Link to="/pricing" className="shrink-0 rounded-md border border-white/20 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/[0.06]">{dashboardAccess.isExpired ? "Renew" : "View plans"}</Link>
            </div>
          )}
          {dashboardAccess.error && (
            <div role="alert" className="border-b border-white/10 bg-[#111318] px-4 py-3 text-sm text-[#A8A8A8] sm:px-6">
              Could not verify plan access. Refresh this page to try again.
            </div>
          )}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.18, ease: "easeOut" }}
              className="min-h-screen"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      </SidebarContext.Provider>
    </DashboardAccessContext.Provider>
  );
};

export default DashboardLayout;
