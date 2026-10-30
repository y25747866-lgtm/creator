import { Link, useLocation, useNavigate } from "react-router-dom";
import { BarChart3, Download, Lock, LogOut, Megaphone, Package, PanelsTopLeft, PlugZap, Settings, Sparkles, UserRound, X } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import nexoraLogo from "@/assets/nexora-logo.webp";

type Access = "all" | "pro" | "hybrid";

const DashboardSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [topUpOpen, setTopUpOpen] = useState(false);
  const { signOut, user } = useAuth();
  const { toast } = useToast();
  const { planType, hasPaidSubscription, subscription } = useSubscription();
  const isExpired = subscription?.status === "expired";
  const paid = hasPaidSubscription && !isExpired;
  const isHybrid = planType === "pro" && paid;
  const planName = isHybrid ? "Hybrid AI OS" : planType === "creator" && paid ? "Pro" : "Starter";

  const mainItems: Array<{ label: string; path: string; access: Access; icon: typeof Sparkles; accent?: string }> = [
    { label: "Hybrid AI OS", path: "/dashboard/hybrid-ai-os", access: "hybrid", icon: Sparkles, accent: "#7928ca" },
    { label: "Product Generator", path: "/dashboard/ebook-generator", access: "all", icon: Package },
    { label: "Marketing Studio", path: "/dashboard/marketing-studio", access: "all", icon: Megaphone },
    { label: "Sales Page Builder", path: "/dashboard/sales-page-builder", access: "all", icon: PanelsTopLeft },
    { label: "Analytics", path: "/dashboard/analytics", access: "pro", icon: BarChart3 },
    { label: "Downloads", path: "/dashboard/downloads", access: "all", icon: Download },
  ];

  const locked = (access: Access) => {
    if (access === "all") return false;
    if (access === "hybrid") return !isHybrid;
    return !paid;
  };

  const handleSignOut = async () => {
    await signOut();
    toast({ title: "Signed out", description: "You have been signed out successfully." });
    navigate("/");
  };

  const navItem = (item: { label: string; path: string; access: Access; icon: typeof Sparkles; accent?: string }, mobile = false) => {
    const isLocked = locked(item.access);
    const isActive = location.pathname === item.path;
    const Icon = item.icon;
    return (
      <Link
        key={item.path}
        to={isLocked ? "/pricing" : item.path}
        aria-label={item.label}
        aria-disabled={isLocked}
        title={item.label}
        className={cn("nexora-sidebar-item group flex items-center gap-3 rounded-lg px-3 py-[10px] text-[13px] transition-colors", mobile && "nexora-sidebar-mobile-item")}
        style={{
          background: isActive ? "#0d1f17" : "transparent",
          color: isActive ? "#00e68e" : isLocked ? "#666666" : "#a0a0a0",
        }}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" style={{ color: item.accent ?? (isActive ? "#00e68e" : "#888888") }} />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {isLocked && <Lock className="nexora-sidebar-lock h-3 w-3 shrink-0 text-[#666666]" />}
      </Link>
    );
  };

  const connectorItem = (
    <Link
      to={paid ? "/dashboard/connectors" : "/pricing"}
      aria-label="Connectors"
      title="Connectors"
      className="nexora-sidebar-item flex items-center gap-3 rounded-lg px-3 py-[10px] text-[13px] text-[#a0a0a0] transition-colors"
    >
      <PlugZap className="h-[18px] w-[18px] shrink-0 text-[#888888]" />
      <span className="min-w-0 flex-1 truncate">Connectors</span>
      {!paid && <Lock className="nexora-sidebar-lock h-3 w-3 shrink-0 text-[#666666]" />}
    </Link>
  );

  const settingsItem = (
    <Link
      to="/dashboard/settings"
      aria-label="Settings"
      title="Settings"
      className="nexora-sidebar-item flex items-center gap-3 rounded-lg px-3 py-[10px] text-[13px] text-[#a0a0a0] transition-colors"
      style={{ background: location.pathname === "/dashboard/settings" ? "#0d1f17" : "transparent", color: location.pathname === "/dashboard/settings" ? "#00e68e" : "#a0a0a0" }}
    >
      <Settings className="h-[18px] w-[18px] shrink-0" />
      <span className="min-w-0 flex-1 truncate">Settings</span>
    </Link>
  );

  return (
    <>
      <aside className="nexora-sidebar fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-[#1e1e1e] bg-[#111111] text-[#e8e8e8]">
        <div className="nexora-sidebar-header border-b border-[#1e1e1e] px-4 pb-4 pt-5">
          <Link to="/dashboard" className="mb-4 flex items-center gap-2.5">
            <img src={nexoraLogo} alt="" width="30" height="30" className="h-[30px] w-[30px] shrink-0 object-contain" />
            <span className="text-[16px] font-semibold tracking-[-0.04em] text-[#e8e8e8]">NexoraOS</span>
          </Link>
          <div className="flex items-center gap-2.5 rounded-lg border border-[#242424] bg-[#151515] px-2.5 py-2">
            <Avatar className="h-7 w-7 border border-[#303030]">
              <AvatarImage src={user?.user_metadata?.avatar_url} alt={user?.user_metadata?.full_name || "User"} />
              <AvatarFallback className="bg-[#202020] text-xs text-[#bdbdbd]">
                {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || <UserRound className="h-3.5 w-3.5" />}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-[#e8e8e8]">{user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Your workspace"}</p>
              <p className="mt-0.5 truncate text-[10px] text-[#888888]">{planName}</p>
            </div>
            <button type="button" onClick={handleSignOut} aria-label="Sign out" title="Sign out" className="rounded-md p-1.5 text-[#777777] transition-colors hover:bg-[#1f1f1f] hover:text-[#e8e8e8]">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <nav aria-label="Dashboard navigation" className="nexora-sidebar-nav flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
          {mainItems.map((item) => navItem(item))}
          <div className="nexora-nav-separator my-2 border-t border-[#242424]" />
          {connectorItem}
          <div className="nexora-mobile-settings">{settingsItem}</div>
        </nav>

        <div className="nexora-sidebar-footer border-t border-[#1e1e1e] px-3 pb-3 pt-3">
          <button type="button" onClick={() => setTopUpOpen(true)} className="nexora-credit-button mb-2 w-full rounded-lg p-2.5 text-left transition-colors hover:bg-[#1a1a1a]" aria-label="Open credit top-up modal">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="font-mono text-[12px] text-[#00e68e]">— / — credits</span>
              <span className="text-[10px] text-[#777777]">Top up</span>
            </div>
            <span className="block h-[3px] w-full overflow-hidden rounded-full bg-[#252525]">
              <span className="block h-full w-1/5 rounded-full bg-[#00e68e]" />
            </span>
          </button>
          <div className="nexora-desktop-settings">{settingsItem}</div>
        </div>
      </aside>

      {topUpOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 px-5 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setTopUpOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="credits-title" className="relative w-full max-w-[440px] rounded-[14px] border border-[#2a2a2a] bg-[#151515] p-7 shadow-2xl">
            <button type="button" aria-label="Close credits dialog" onClick={() => setTopUpOpen(false)} className="absolute right-4 top-4 rounded-lg p-2 text-[#888888] transition-colors hover:bg-[#202020] hover:text-white"><X className="h-4 w-4" /></button>
            <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl border border-[#174b37] bg-[#0d1f17] text-[#00e68e]"><Sparkles className="h-5 w-5" /></div>
            <h2 id="credits-title" className="text-lg font-semibold text-[#e8e8e8]">Credit balance</h2>
            <p className="mt-2 text-sm leading-6 text-[#888888]">Live credit usage and top-up checkout are not exposed by the current billing service, so this screen avoids showing a fabricated balance. Your existing plan access is unchanged.</p>
            <button type="button" onClick={() => { setTopUpOpen(false); navigate("/pricing"); }} className="mt-6 h-11 w-full rounded-[10px] bg-[#00e68e] px-4 text-sm font-semibold text-black transition-colors hover:bg-[#31f2a6]">View plans</button>
          </section>
        </div>
      )}
    </>
  );
};

export default DashboardSidebar;
