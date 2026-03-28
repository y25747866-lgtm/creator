import { ReactNode, useState, createContext, useContext, useEffect } from "react";
import DashboardSidebar from "./DashboardSidebar";
import Background3D from "@/components/Background3D";
import { Moon, Sun } from "lucide-react";

interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType>({ collapsed: false, setCollapsed: () => {} });
export const useSidebarState = () => useContext(SidebarContext);

const SIDEBAR_KEY = "nexora_sidebar_collapsed";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [collapsed, setCollapsedState] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_KEY) === "true"; } catch { return false; }
  });
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "dark" | "light" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  };

  const setCollapsed = (v: boolean) => {
    setCollapsedState(v);
    try { localStorage.setItem(SIDEBAR_KEY, String(v)); } catch {}
  };

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <div className="fixed inset-0 z-0">
          <Background3D />
        </div>
        <DashboardSidebar />
        
        <main
          className="relative z-10 min-h-screen transition-all duration-300"
          style={{ marginLeft: collapsed ? 80 : 280 }}
        >
          <header className="sticky top-0 z-30 bg-[var(--bg-primary)]/80 backdrop-blur-xl border-b border-[var(--border)] px-8 py-4">
            <div className="flex items-center justify-end gap-3">
              <button 
                onClick={toggleTheme}
                className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all bg-[var(--bg-card)] border border-[var(--border)]"
              >
                {theme === "dark" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>
            </div>
          </header>
          
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
    </SidebarContext.Provider>
  );
};

export default DashboardLayout;
