import { ReactNode, createContext, useContext, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { isPaidPlan, isSubscriptionActive, normalizePlanType } from "@/lib/subscription";
import DashboardSidebar from "./DashboardSidebar";
import { Skeleton } from "@/components/ui/skeleton";

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

const DashboardShellSkeleton = () => (
  <div className="app-shell-skeleton flex min-h-screen bg-[#080A0C]" role="status" aria-label="Loading workspace">
    <aside className="hidden w-[280px] shrink-0 border-r border-white/10 p-4 md:block"><Skeleton className="mb-8 h-7 w-32" /><div className="space-y-3">{["w-4/5", "w-3/5", "w-3/4", "w-1/2", "w-2/3"].map((width, index) => <Skeleton key={index} className={`h-5 ${width}`} />)}</div></aside>
    <main className="flex min-w-0 flex-1 flex-col items-center px-4 pt-20 sm:px-8"><div className="mb-6 flex gap-3">{[1, 2, 3, 4, 5].map((item) => <Skeleton key={item} className="h-16 w-16 rounded-full" />)}</div><Skeleton className="mb-5 h-28 w-full max-w-[420px]" /><div className="mb-5 flex gap-2"><Skeleton className="h-8 w-24 rounded-full" /><Skeleton className="h-8 w-28 rounded-full" /><Skeleton className="h-8 w-24 rounded-full" /><Skeleton className="h-8 w-28 rounded-full" /></div><Skeleton className="h-20 w-full max-w-3xl rounded-xl" /></main>
  </div>
);

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
      const [subscriptionResult, analyticsResult, agentResult] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("plan,plan_type,status,end_date,expires_at")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.rpc("check_user_access", { user_uuid: user!.id, feature: "analytics" }),
        supabase.rpc("check_user_access", { user_uuid: user!.id, feature: "agent_system" }),
      ]);
      if (subscriptionResult.error) throw subscriptionResult.error;
      return {
        subscription: subscriptionResult.data,
        analyticsAccess: analyticsResult.error ? false : analyticsResult.data === true,
        agentAccess: agentResult.error ? false : agentResult.data === true,
      };
    },
  });
  const accessLoading = authLoading || (Boolean(user?.id) && subscriptionQuery.isLoading);
  const subscription = subscriptionQuery.data?.subscription;
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
    analyticsAccess: Boolean(subscriptionQuery.data?.analyticsAccess) && hasPaidSubscription,
    agentAccess: Boolean(subscriptionQuery.data?.agentAccess) && hasPaidSubscription,
    renewalRequired: Boolean(user?.id) && !accessLoading && !subscriptionQuery.isError && !hasPaidSubscription,
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

  if (authLoading) return <DashboardShellSkeleton />;

  return (
    <DashboardAccessContext.Provider value={dashboardAccess}>
      <SidebarContext.Provider value={{ collapsed, setCollapsed, mobileOpen, setMobileOpen }}>
      <div className="nexora-dashboard min-h-screen" style={{ background: "var(--nexora-workspace-background)", color: "var(--nexora-workspace-foreground)" }}>
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
