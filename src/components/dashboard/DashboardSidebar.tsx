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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import nexoraLogo from "@/assets/nexora-logo.png";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useSidebarState } from "./DashboardLayout";

const DashboardSidebar = () => {
  const { collapsed, setCollapsed } = useSidebarState();
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { toast } = useToast();

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: BookOpen, label: "AI Product Generator", path: "/dashboard/ebook-generator" },
    { icon: Package, label: "Marketing Studio", path: "/dashboard/marketing-studio" },
    { icon: BarChart3, label: "Sales Page Builder", path: "/dashboard/sales-page-builder" },
    { icon: LineChart, label: "Analytics", path: "/dashboard/analytics" },
    { icon: Download, label: "Downloads & Exports", path: "/dashboard/downloads" },
    { icon: Settings, label: "Settings", path: "/dashboard/settings" },
  ];

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
    });
    navigate("/");
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed left-0 top-0 bottom-0 z-40 bg-sidebar border-r border-sidebar-border flex flex-col"
    >
      {/* Logo */}
      <div className="p-5 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-3">
          <img src={nexoraLogo} alt="NexoraOS" className="w-9 h-9 shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="font-bold text-lg text-sidebar-foreground"
              >
                NexoraOS
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path}>
              <motion.div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
                whileHover={{ x: collapsed ? 0 : 2 }}
                whileTap={{ scale: 0.98 }}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <item.icon className={cn("w-[18px] h-[18px] shrink-0 ml-1", isActive && "text-primary")} />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-sm"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </Link>
          );
        })}

        {/* Start Your Digital Business Section */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pt-6"
            >
              <p className="px-3 text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-widest mb-2">
                Start your digital business today
              </p>
              <div className="space-y-1">
                <a
                  href="https://whop.com/?a=zm1a"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all duration-200"
                >
                  <ExternalLink className="w-4 h-4 shrink-0 ml-1" />
                  <span className="text-sm">Whop</span>
                </a>
                <a
                  href="https://payhip.com?fp_ref=yesh-malik48"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all duration-200"
                >
                  <ExternalLink className="w-4 h-4 shrink-0 ml-1" />
                  <span className="text-sm">Payhip</span>
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Sign Out & Collapse */}
      <div className="p-3 border-t border-sidebar-border space-y-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className={cn(
            "w-full text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10 rounded-lg",
            collapsed ? "justify-center px-2" : "justify-start"
          )}
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="ml-2 text-sm"
              >
                Sign Out
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full justify-center rounded-lg text-sidebar-foreground/50 hover:text-sidebar-foreground"
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
    </motion.aside>
  );
};

export default DashboardSidebar;
