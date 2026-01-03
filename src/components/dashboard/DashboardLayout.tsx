import { ReactNode } from "react";
import DashboardSidebar from "./DashboardSidebar";
import Background3D from "@/components/Background3D";
import ThemeToggle from "@/components/ThemeToggle";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <div className="min-h-screen">
      <Background3D />
      <DashboardSidebar />
      
      <main className="ml-[280px] min-h-screen transition-all duration-300">
        <header className="sticky top-0 z-30 glass-panel border-b border-border/50 px-8 py-4">
          <div className="flex items-center justify-end">
            <ThemeToggle />
          </div>
        </header>
        
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
