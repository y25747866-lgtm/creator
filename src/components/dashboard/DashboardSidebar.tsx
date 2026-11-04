import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  LogOut,
  Settings,
  User as UserIcon,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import nexoraLogo from "@/assets/nexora-logo.webp";
import { useSidebarState } from "./DashboardLayout";

const DashboardSidebar = () => {
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useSidebarState();
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { toast } = useToast();
  const showLabels = !collapsed || mobileOpen;

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
        className={`fixed inset-y-0 left-0 z-40 flex w-[284px] flex-col border-r border-[#2B2B2B] bg-[#141414] transition-[width,transform] duration-200 md:translate-x-0 ${
          collapsed ? "md:w-20" : "md:w-[280px]"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#292929] px-4">
          <Link to="/dashboard" onClick={closeMobile} className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFFFFF]">
            <img src={nexoraLogo} alt="" width="34" height="34" className="h-[34px] w-[34px] shrink-0 rounded-lg" />
            {showLabels && (
              <span className="truncate text-[15px] font-semibold tracking-[-0.02em] text-[#F2F2F2]">NexoraOS</span>
            )}
          </Link>
          <button
            type="button"
            onClick={closeMobile}
            aria-label="Close navigation drawer"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#929292] hover:bg-[#222] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFFFFF] md:hidden"
          >
            <X size={17} />
          </button>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-6" aria-label="Main">
          <p className={`mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#686868] ${showLabels ? "" : "sr-only"}`}>Workspace</p>
          <Link
            to="/dashboard/downloads"
            onClick={closeMobile}
            title={showLabels ? undefined : "Downloads"}
            aria-current={location.pathname === "/dashboard/downloads" ? "page" : undefined}
            className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFFFFF] ${
              location.pathname === "/dashboard/downloads"
                ? "bg-[#222] text-white"
                : "text-[#A0A0A0] hover:bg-[#1D1D1D] hover:text-white"
            } ${showLabels ? "" : "justify-center"}`}
          >
            <Download className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
            {showLabels && <span>Downloads</span>}
          </Link>
        </nav>

        <div className="shrink-0 border-t border-[#292929] p-3">
          <div className={`flex items-center gap-3 rounded-xl px-2.5 py-2 ${showLabels ? "" : "justify-center"}`}>
            <Avatar className="h-8 w-8 shrink-0 border border-[#343434]">
              <AvatarImage src={user?.user_metadata?.avatar_url} alt="" />
              <AvatarFallback className="bg-[#252525] text-xs text-[#D0D0D0]">
                {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || <UserIcon size={15} />}
              </AvatarFallback>
            </Avatar>
            {showLabels && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-[#DADADA]">{user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Account"}</p>
                <p className="truncate text-[10px] text-[#777]">{user?.email || "Workspace account"}</p>
              </div>
            )}
          </div>
          <div className={`mt-2 flex gap-1 ${showLabels ? "flex-col" : "flex-col"}`}>
            <Link
              to="/dashboard/settings"
              onClick={closeMobile}
              title={showLabels ? undefined : "Settings"}
              className={`flex min-h-9 items-center gap-3 rounded-lg px-3 text-xs text-[#8D8D8D] transition hover:bg-[#202020] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFFFFF] ${showLabels ? "" : "justify-center"}`}
            >
              <Settings size={16} className="shrink-0" aria-hidden="true" />
              {showLabels && <span>Settings</span>}
            </Link>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              title={showLabels ? undefined : "Sign out"}
              className={`flex min-h-9 items-center gap-3 rounded-lg px-3 text-left text-xs text-[#8D8D8D] transition hover:bg-[#2A1E1E] hover:text-[#F0BABA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFFFFF] ${showLabels ? "" : "justify-center"}`}
            >
              <LogOut size={16} className="shrink-0" aria-hidden="true" />
              {showLabels && <span>Sign out</span>}
            </button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(!collapsed)}
              className={`mt-1 hidden min-h-9 rounded-lg text-[#777] hover:bg-[#202020] hover:text-white md:flex ${showLabels ? "justify-start px-3" : "justify-center px-2"}`}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /><span className="ml-2 text-xs">Collapse</span></>}
            </Button>
          </div>
        </div>
      </aside>

    </>
  );
};

export default DashboardSidebar;
