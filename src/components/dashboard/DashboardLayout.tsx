import { ReactNode } from "react";
import DashboardSidebar from "./DashboardSidebar";
import Background3D from "@/components/Background3D";
import ThemeToggle from "@/components/ThemeToggle";
import TrialTimer from "@/components/TrialTimer";
import TrialExpiredModal from "@/components/TrialExpiredModal";
import { useFreeTrial } from "@/hooks/useFreeTrial";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { expired, isFreeUser } = useFreeTrial();

  return (
    <div className="min-h-screen">
      <Background3D />
      <DashboardSidebar />
      
      <main className="ml-[280px] min-h-screen transition-all duration-300">
        <header className="sticky top-0 z-30 glass-panel border-b border-border/50 px-8 py-4">
          <div className="flex items-center justify-end gap-3">
            <TrialTimer />
            <ThemeToggle />
          </div>
        </header>
        
        <div className="p-8">
          {children}
        </div>
      </main>

      {isFreeUser && <TrialExpiredModal open={expired} />}
    </div>
  );
};

export default DashboardLayout;
