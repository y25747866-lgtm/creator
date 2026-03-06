import { ReactNode, useState, createContext, useContext } from "react";
import DashboardSidebar from "./DashboardSidebar";
import Background3D from "@/components/Background3D";
import ThemeToggle from "@/components/ThemeToggle";
import TrialExpiredModal from "@/components/TrialExpiredModal";
import { useFreeTrial } from "@/hooks/useFreeTrial";

interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType>({ collapsed: false, setCollapsed: () => {} });
export const useSidebarState = () => useContext(SidebarContext);

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { expired, isFreeUser } = useFreeTrial();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      <div className="min-h-screen">
        <Background3D />
        <DashboardSidebar />
        
        <main
          className="min-h-screen transition-all duration-300"
          style={{ marginLeft: collapsed ? 80 : 280 }}
        >
          <header className="sticky top-0 z-30 glass-panel border-b border-border/50 px-8 py-4">
            <div className="flex items-center justify-end gap-3">
              <ThemeToggle />
            </div>
          </header>
          
          <div className="p-8">
            {children}
          </div>
        </main>

        {isFreeUser && <TrialExpiredModal open={expired} />}
      </div>
    </SidebarContext.Provider>
  );
};

export default DashboardLayout;
