import { useNavigate } from "react-router-dom";
import { Lock, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UpgradeOverlayProps {
  message?: string;
}

const UpgradeOverlay = ({ message = "Upgrade to unlock full analytics access" }: UpgradeOverlayProps) => {
  const navigate = useNavigate();

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-xl">
      <div className="text-center space-y-4 p-8 max-w-md">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-bold">View-Only Mode</h3>
        <p className="text-muted-foreground text-sm">{message}</p>
        <Button onClick={() => navigate("/pricing")} className="gap-2">
          <Crown className="w-4 h-4" />
          Upgrade Now
        </Button>
      </div>
    </div>
  );
};

export default UpgradeOverlay;
