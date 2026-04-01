import { ReactNode, useState, createContext, useContext } from "react";
import DashboardSidebar from "./DashboardSidebar";
import CanvasParticles from "@/components/CanvasParticles";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

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
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const setCollapsed = (v: boolean) => {
    setCollapsedState(v);
    try { localStorage.setItem(SIDEBAR_KEY, String(v)); } catch {}
  };

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      <div className="min-h-screen bg-background text-foreground">
        <div className="fixed inset-0 z-0">
          <CanvasParticles />
        </div>
        <DashboardSidebar />
        
        <main
          className="relative z-10 min-h-screen transition-all duration-300"
          style={{ marginLeft: collapsed ? 80 : 280 }}
        >
          <header className="sticky top-0 z-30 bg-background/70 backdrop-blur-2xl border-b border-border px-8 py-5">
            <div className="flex items-center justify-end gap-4">
              <button 
                onClick={toggleTheme}
                className="p-3 rounded-xl text-muted-foreground hover:text-foreground transition-all bg-muted/50 border border-border hover:border-primary/30 hover:bg-primary/5"
              >
                {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          </header>
          
          <div className="p-10">
            {children}
          </div>
        </main>
      </div>
    </SidebarContext.Provider>
  );
};

export default DashboardLayout;
