import { ReactNode, useState, createContext, useContext } from "react";
import DashboardSidebar from "./DashboardSidebar";

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

  const setCollapsed = (v: boolean) => {
    setCollapsedState(v);
    try { localStorage.setItem(SIDEBAR_KEY, String(v)); } catch {}
  };

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      <div className="min-h-screen" style={{ background: '#0A0A0A', color: '#FFFFFF' }}>
        <DashboardSidebar />
        
        <main
          className="relative z-10 min-h-screen transition-all duration-300"
          style={{ marginLeft: collapsed ? 80 : 280, background: '#0A0A0A' }}
        >
          <header className="sticky top-0 z-30" style={{ background: '#0A0A0A', borderBottom: '1px solid #1A1A1A', padding: '20px 32px' }}>
            <div className="flex items-center justify-end gap-4 h-10">
              {/* Theme toggle removed as requested */}
            </div>
          </header>
          
          <div style={{ background: '#0A0A0A' }}>
            {children}
          </div>
        </main>
      </div>
    </SidebarContext.Provider>
  );
};

export default DashboardLayout;
