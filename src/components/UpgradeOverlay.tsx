import { useNavigate } from "react-router-dom";
import { Lock, Crown, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";

interface UpgradeOverlayProps {
  message?: string;
}

export const UpgradeOverlay = ({ message }: UpgradeOverlayProps) => {
  const navigate = useNavigate();
  
  const { hasPaidSubscription, subscription } = useSubscription();

  // Check if subscription is expired
  const isExpired = subscription?.status === "expired";

  // Active paid users see nothing — no lock ever
  if (hasPaidSubscription && !isExpired) return null;

  // Determine the icon and title based on status
  const icon = isExpired ? (
    <AlertCircle className="w-8 h-8 text-destructive" />
  ) : (
    <Lock className="w-8 h-8 text-primary" />
  );

  const title = isExpired ? "Subscription Expired" : "View-Only Mode";
  const defaultMessage = isExpired
    ? "Your subscription has expired. Renew your plan to continue using premium features."
    : "The Sales Page Builder is available on Creator and Pro plans. Upgrade to start generating high-converting sales pages.";

  const bgColor = isExpired ? "bg-destructive/10" : "bg-primary/10";

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-xl">
      <div className="text-center space-y-4 p-8 max-w-md">
        <div className={`w-16 h-16 rounded-full ${bgColor} flex items-center justify-center mx-auto`}>
          {icon}
        </div>
        <h3 className="text-xl font-bold">{title}</h3>
        <p className="text-muted-foreground text-sm">
          {message || defaultMessage}
        </p>
        <Button onClick={() => navigate("/pricing")} className="gap-2">
          <Crown className="w-4 h-4" />
          {isExpired ? "Renew Now" : "Upgrade Now"}
        </Button>
      </div>
    </div>
  );
};

export default UpgradeOverlay;
