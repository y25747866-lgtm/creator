import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Download,
  Plus,
  Package,
  FolderOpen,
  BarChart3,
  Plug,
  Puzzle,
  ArrowUpRight,
  LockKeyhole,
  LogOut,
  Settings,
  User as UserIcon,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getLocalCreatorConversations, listCreatorConversations, type CreatorConversationSummary } from "@/lib/chatPersistence";
import nexoraLogo from "@/assets/nexora-logo.webp";
import { useDashboardAccess, useSidebarState } from "./DashboardLayout";
import CreditBalance from "./CreditBalance";

const DashboardSidebar = () => {
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useSidebarState();
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const access = useDashboardAccess();
  const { toast } = useToast();
  const [historyItems, setHistoryItems] = useState<CreatorConversationSummary[]>([]);

  useEffect(() => {
    if (!user?.id) { setHistoryItems([]); return; }
    let cancelled = false;
    const readHistory = async () => {
      const localItems = getLocalCreatorConversations(user.id);
      try {
        const remoteItems = await listCreatorConversations(user.id);
        if (cancelled) return;
        const merged = new Map(remoteItems.map((item) => [item.id, item]));
        for (const item of localItems) if (!merged.has(item.id)) merged.set(item.id, item);
        setHistoryItems([...merged.values()].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 8));
      } catch {
        if (!cancelled) setHistoryItems(localItems.slice(0, 8));
      }
    };
    void readHistory();
    window.addEventListener("storage", readHistory);
    window.addEventListener("nexoraos:history-updated", readHistory);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", readHistory);
      window.removeEventListener("nexoraos:history-updated", readHistory);
    };
  }, [user?.id]);
  const showLabels = !collapsed || mobileOpen;
  const workspaceLocked = Boolean(user?.id) && !access.loading && !access.hasPaidSubscription;

  const renderWorkspaceLink = (path: string, label: string, Icon: LucideIcon, isCurrent: boolean, allowed = true, hidden = false) => {
    const locked = Boolean(user?.id) && !access.loading && !allowed;
    const active = isCurrent && !locked;
    return (
      <Link
        to={locked ? "/pricing" : path}
        onClick={closeMobile}
        title={locked ? "Upgrade to Pro" : showLabels ? undefined : label}
        aria-current={active ? "page" : undefined}
        aria-disabled={locked || undefined}
        className={`${hidden ? "hidden" : ""} nav-item flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm transition-colors hover:bg-[#111318] ${active ? "active bg-[#111318] text-white" : locked ? "text-white/35" : "text-white/60"} ${showLabels ? "" : "justify-center"}`}
      >
        <Icon size={17} className="shrink-0" aria-hidden="true" />
        {showLabels && <span className="min-w-0 flex-1 truncate">{label}</span>}
        {showLabels && locked && <LockKeyhole size={13} className="shrink-0 text-white/45" aria-hidden="true" />}
      </Link>
    );
  };

  const handleSignOut = async () => {
    await signOut();
    toast({ title: "Signed out", description: "You have been signed out successfully." });
    setMobileOpen(false);
    navigate("/");
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <aside
        aria-label="Workspace navigation"
        style={{ backgroundColor: "var(--nexora-sidebar-background)", borderColor: "var(--nexora-sidebar-border)" }}
        className={`fixed inset-y-0 left-0 z-40 flex w-[284px] flex-col border-r border-white/[0.08] transition-[width,transform] duration-200 md:translate-x-0 ${
          collapsed ? "md:w-20" : "md:w-[280px]"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className={`flex h-16 shrink-0 items-center border-b border-[#111318] px-3 ${showLabels ? "justify-between" : "justify-center"}`}>
          <Link to="/dashboard" onClick={closeMobile} className="flex min-w-0 items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C96A3]">
            <img src={nexoraLogo} alt="NexoraOS" width="28" height="28" className="h-7 w-7 shrink-0 rounded-lg" />
            {showLabels && <span className="truncate text-[15px] font-semibold tracking-[-0.02em] text-white">NexoraOS</span>}
          </Link>
          {showLabels && <button type="button" onClick={() => setCollapsed(true)} aria-label="Collapse sidebar" className="hidden h-9 w-9 items-center justify-center rounded-lg text-white/50 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C96A3] md:flex"><ChevronLeft size={17} /></button>}
          <button type="button" onClick={closeMobile} aria-label="Close navigation drawer" className="flex h-9 w-9 items-center justify-center rounded-lg text-[#6B7280] hover:bg-[#111318] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C96A3] md:hidden">
            <X size={17} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4" aria-label="Main">
          <button type="button" onClick={() => { if (workspaceLocked) { navigate("/pricing"); closeMobile(); return; } window.dispatchEvent(new Event("nexoraos:new-chat")); navigate("/dashboard"); closeMobile(); }} title={workspaceLocked ? "Upgrade to Pro" : showLabels ? undefined : "New chat"} className={`mb-4 flex min-h-10 w-full items-center gap-3 rounded-xl border border-white/15 px-3 text-sm transition-colors hover:bg-[#111318] ${workspaceLocked ? "text-white/40" : "text-white"} ${showLabels ? "" : "justify-center"}`}>
            <Plus size={17} className="shrink-0" aria-hidden="true" />
            {showLabels && <><span className="flex-1 text-left">New chat</span>{workspaceLocked ? <LockKeyhole size={13} className="text-white/45" aria-hidden="true" /> : <span className="text-[10px] text-white/35">Ctrl K</span>}</>}
          </button>
          <p className={`mb-2 px-3 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35 ${showLabels ? "" : "sr-only"}`}>Workspace</p>
          {renderWorkspaceLink("/dashboard", "Product Studio", Package, location.pathname === "/dashboard", access.hasPaidSubscription)}
          {renderWorkspaceLink("/dashboard/downloads", "Downloads", Download, location.pathname === "/dashboard/downloads", access.hasPaidSubscription)}
          {renderWorkspaceLink("/dashboard/products", "Projects", FolderOpen, location.pathname === "/dashboard/products", access.hasPaidSubscription)}
          {renderWorkspaceLink("/dashboard/skills", "Skills", Puzzle, location.pathname.startsWith("/dashboard/skills"), access.hasPaidSubscription)}
          {renderWorkspaceLink("/dashboard/analytics", "Analytics", BarChart3, location.pathname.startsWith("/dashboard/analytics"), access.analyticsAccess)}
          <Link to="/app/connectors" onClick={closeMobile} title={showLabels ? undefined : "Plugins"} aria-current={location.pathname === "/app/connectors" ? "page" : undefined} className={`nav-item flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm transition hover:bg-[#111318] ${location.pathname === "/app/connectors" ? "active bg-[#111318] text-white" : "text-white/60"} ${showLabels ? "" : "justify-center"}`}>
            <Plug size={17} className="shrink-0" aria-hidden="true" />
            {showLabels && <span>Plugins</span>}
          </Link>
          <div className={`my-4 border-t border-white/10 pt-4 ${showLabels ? "" : "sr-only"}`}>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">History</p>
            {historyItems.length ? historyItems.map((item) => (
              <button key={item.id} type="button" onClick={() => { navigate(`/dashboard?conversation=${encodeURIComponent(item.id)}`); closeMobile(); }} title={item.title} className="block w-full truncate rounded-lg px-3 py-2 text-left text-xs text-white/50 transition hover:bg-[#111318] hover:text-white">{item.title.length > 27 ? `${item.title.slice(0, 27)}…` : item.title}</button>
            )) : <p className="px-3 py-2 text-xs leading-5 text-white/35">Your recent prompts will appear here.</p>}
          </div>
        </nav>

        <div className="shrink-0 border-t border-[#111318] p-3">
          {user?.id ? (
            <>
              <CreditBalance showLabels={showLabels} />
              <div className={`flex items-center gap-3 rounded-xl px-2.5 py-2 ${showLabels ? "" : "justify-center"}`}>
                <Avatar className="h-8 w-8 shrink-0 border border-[#303640]">
                  <AvatarImage src={user.user_metadata?.avatar_url} alt="" />
                  <AvatarFallback className="bg-[#111318] text-xs text-[#B7BEC8]">
                    {user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase() || <UserIcon size={15} />}
                  </AvatarFallback>
                </Avatar>
                {showLabels && (
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-[#DADADA]">{user.user_metadata?.full_name || user.email?.split("@")[0] || "Account"}</p>
                    <p className="truncate text-[10px] text-[#6B7280]">{user.email || "Workspace account"}</p>
                  </div>
                )}
              </div>
              <div className={`mt-2 flex items-center gap-2 ${showLabels ? "" : "flex-col"}`}>
                <Link to="/dashboard/settings" title="Account settings" className="flex min-h-9 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 text-xs text-white/55 transition hover:bg-[#111318] hover:text-white">
                  <Settings size={16} className="shrink-0" aria-hidden="true" />
                  {showLabels && <span className="truncate">Settings</span>}
                </Link>
                {showLabels && <Link to="/pricing" className="flex min-h-8 items-center gap-1 rounded-lg border border-white/20 px-2 text-[11px] text-white hover:bg-[#111318]">Upgrade <ArrowUpRight size={12}/></Link>}
                <button type="button" onClick={() => void handleSignOut()} title="Sign out" aria-label="Sign out" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/50 hover:bg-[#111318] hover:text-white"><LogOut size={16}/></button>
              </div>
            </>
          ) : (
            <div className={`rounded-xl px-2.5 py-2 ${showLabels ? "" : "flex justify-center"}`} title={showLabels ? undefined : "Guest preview"}>
              {showLabels ? (
                <>
                  <p className="text-xs font-medium text-[#DADADA]">Guest preview</p>
                  <p className="mt-1 text-[10px] leading-4 text-[#6B7280]">Read-only workspace preview</p>
                </>
              ) : <UserIcon size={16} aria-hidden="true" />}
            </div>
          )}
        </div>
      </aside>

    </>
  );
};

export default DashboardSidebar;
