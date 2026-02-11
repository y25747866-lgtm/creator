import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  BookOpen,
  Download,
  Settings,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import nexoraLogo from "@/assets/nexora-logo.png";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const DashboardSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { toast } = useToast();

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: BookOpen, label: "Ebook Generator", path: "/dashboard/ebook-generator" },
    { icon: BarChart3, label: "Product Analytics", path: "/dashboard/products" },
    { icon: Download, label: "Download History", path: "/dashboard/downloads" },
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
      className="fixed left-0 top-0 bottom-0 z-40 glass-panel border-r border-border/50 flex flex-col"
    >
      {/* Logo */}
      <div className="p-4 border-b border-border/50">
        <Link to="/" className="flex items-center gap-3">
          <img src={nexoraLogo} alt="NexoraOS" className="w-10 h-10 shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="font-bold text-xl"
              >
                NexoraOS
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path}>
              <motion.div
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                whileHover={{ x: collapsed ? 0 : 4 }}
                whileTap={{ scale: 0.98 }}
              >
                <item.icon className={cn("w-5 h-5 shrink-0", isActive && "text-primary")} />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="font-medium"
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
              <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Start your digital business today
              </p>
              <div className="space-y-2">
                <a
                  href="https://whop.com/?a=zm1a"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all group"
                >
                  <ExternalLink className="w-4 h-4 shrink-0" />
                  <span className="font-medium text-sm">Whop</span>
                </a>
                <a
                  href="https://payhip.com?fp_ref=yesh-malik48"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all group"
                >
                  <ExternalLink className="w-4 h-4 shrink-0" />
                  <span className="font-medium text-sm">Payhip</span>
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Sign Out & Collapse */}
      <div className="p-4 border-t border-border/50 space-y-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className={cn(
            "w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10",
            collapsed ? "justify-center px-2" : "justify-start"
          )}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="ml-2"
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
          className="w-full justify-center"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5 mr-2" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </motion.aside>
  );
};

export default DashboardSidebar;
