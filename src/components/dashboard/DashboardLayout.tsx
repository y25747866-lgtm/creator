import { ReactNode, createContext, useContext, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLocation } from "react-router-dom";
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

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
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
    <SidebarContext.Provider value={{ collapsed, setCollapsed, mobileOpen, setMobileOpen }}>
      <div className="nexora-dashboard min-h-screen bg-[#121212] text-[#F5F5F5]">
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
  );
};

export default DashboardLayout;
