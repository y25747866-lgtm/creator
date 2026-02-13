import { Clock } from "lucide-react";
import { useFreeTrial } from "@/hooks/useFreeTrial";

const TrialTimer = () => {
  const { isFreeUser, remainingFormatted, remainingMs } = useFreeTrial();

  if (!isFreeUser) return null;

  const isUrgent = remainingMs < 2 * 60 * 1000; // under 2 min

  return (
    <div
      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
        isUrgent
          ? "bg-destructive/10 text-destructive"
          : "bg-primary/10 text-primary"
      }`}
    >
      <Clock className="w-3.5 h-3.5" />
      {remainingFormatted}
    </div>
  );
};

export default TrialTimer;
