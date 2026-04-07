import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  BookOpen,
  Download,
  Settings,
  BarChart3,
  Package,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LogOut,
  LineChart,
  Lock,
  User as UserIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import nexoraLogo from "@/assets/nexora-logo.png";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { getPlanDisplayName } from "@/lib/subscription";
import { useSidebarState } from "./DashboardLayout";

const DashboardSidebar = () => {
  const { collapsed, setCollapsed } = useSidebarState();
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { toast } = useToast();
  const { planType, hasPaidSubscription, subscription } = useSubscription();

  const isExpired = subscription?.status === "expired";
  const isCreatorOrAbove = (planType === "creator" || planType === "pro") && !isExpired;
  const isProPlan = planType === "pro" && !isExpired;

  const planLabel = getPlanDisplayName(planType);

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard", access: "free" as const },
    { icon: BookOpen, label: "AI Product Generator", path: "/dashboard/ebook-generator", access: "free" as const },
    { icon: Package, label: "Marketing Studio", path: "/dashboard/marketing-studio", access: "free" as const },
    { icon: BarChart3, label: "Sales Page Builder", path: "/dashboard/sales-page-builder", access: "creator" as const },
    { icon: LineChart, label: "Analytics", path: "/dashboard/analytics", access: "free" as const },
    { icon: Download, label: "Downloads & Exports", path: "/dashboard/downloads", access: "creator" as const },
    { icon: Settings, label: "Settings", path: "/dashboard/settings", access: "free" as const },
  ];

  const handleSignOut = async () => {
    await signOut();
    toast({ title: "Signed out", description: "You have been signed out successfully." });
    navigate("/");
  };

  const isLocked = (access: "free" | "creator" | "pro") => {
    if (access === "free") return false;
    if (access === "creator") return !isCreatorOrAbove;
    if (access === "pro") return !isProPlan;
    return false;
  };

  const getBadge = (access: "free" | "creator" | "pro") => {
    if (access === "pro") return "PRO";
    if (access === "creator") return "CREATOR";
    return null;
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed left-0 top-0 bottom-0 z-40 flex flex-col"
      style={{ background: '#111111', borderRight: '1px solid #1A1A1A' }}
    >
      {/* Logo & Plan Badge */}
      <div className="p-5" style={{ borderBottom: '1px solid #1A1A1A' }}>
        <Link to="/" className="flex items-center gap-3">
          <img src={nexoraLogo} alt="NexoraOS" className="w-9 h-9 shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-2"
              >
                <span className="font-bold text-lg text-white">NexoraOS</span>
                <span
                  style={{
                    background: '#1A1A1A',
                    border: '1px solid #2A2A2A',
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: '10px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {planLabel}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const locked = isLocked(item.access);
          const badge = getBadge(item.access);

          return (
            <Link key={item.path} to={item.path}>
              <motion.div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative",
                  locked && "opacity-40"
                )}
                style={{
                  background: isActive ? '#1A1A1A' : 'transparent',
                  color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
                  borderLeft: isActive ? '2px solid #FFFFFF' : '2px solid transparent',
                }}
                whileHover={{ x: collapsed ? 0 : 2, background: isActive ? '#1A1A1A' : '#151515' }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="relative">
                  <item.icon className="w-[18px] h-[18px] shrink-0 ml-1" style={{ color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.5)' }} />
                  {locked && (
                    <div className="absolute -top-1 -right-1 rounded-full p-0.5" style={{ background: '#111111' }}>
                      <Lock className="w-2 h-2" style={{ color: 'rgba(255,255,255,0.3)' }} />
                    </div>
                  )}
                </div>
                <AnimatePresence>
                  {!collapsed && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center justify-between flex-1"
                    >
                      <span className="text-sm" style={{ fontWeight: isActive ? 500 : 400 }}>{item.label}</span>
                      {locked && badge && (
                        <span style={{
                          background: '#1A1A1A',
                          border: '1px solid #2A2A2A',
                          color: 'rgba(255,255,255,0.6)',
                          fontSize: '9px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '3px',
                        }}>
                          {badge}
                        </span>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </Link>
          );
        })}

        {/* External Links */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-6">
              <p className="px-3 text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.2)' }}>
                Start your digital business today
              </p>
              <div className="space-y-1">
                {[
                  { href: "https://whop.com/?a=zm1a", label: "Whop" },
                  { href: "https://payhip.com?fp_ref=yesh-malik48", label: "Payhip" },
                ].map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200"
                    style={{ color: 'rgba(255,255,255,0.4)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#151515'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
                  >
                    <ExternalLink className="w-4 h-4 shrink-0 ml-1" />
                    <span className="text-sm">{link.label}</span>
                  </a>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* User Profile & Sign Out */}
      <div className="p-3 space-y-2" style={{ borderTop: '1px solid #1A1A1A' }}>
        <div className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg",
          collapsed ? "justify-center px-2" : "justify-start"
        )}>
          <Avatar className="h-8 w-8" style={{ border: '1px solid #2A2A2A' }}>
            <AvatarImage src={user?.user_metadata?.avatar_url} alt={user?.user_metadata?.full_name || "User"} />
            <AvatarFallback style={{ background: '#1A1A1A', color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
              {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || <UserIcon className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex flex-col overflow-hidden">
                <span className="text-sm font-medium text-white truncate">
                  {user?.user_metadata?.full_name || user?.email?.split('@')[0] || "User"}
                </span>
                <span className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {user?.email}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className={cn(
              "w-full rounded-lg",
              collapsed ? "justify-center px-2" : "justify-start"
            )}
            style={{ color: 'rgba(255,255,255,0.4)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <LogOut className="w-[18px] h-[18px] shrink-0" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="ml-2 text-sm">
                  Sign Out
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full justify-center rounded-lg"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            {collapsed ? (
              <ChevronRight className="w-[18px] h-[18px]" />
            ) : (
              <>
                <ChevronLeft className="w-[18px] h-[18px] mr-2" />
                <span className="text-sm">Collapse</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.aside>
  );
};

export default DashboardSidebar;
