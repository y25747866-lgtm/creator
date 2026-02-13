import { useNavigate } from "react-router-dom";
import { Crown, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface TrialExpiredModalProps {
  open: boolean;
}

const TrialExpiredModal = ({ open }: TrialExpiredModalProps) => {
  const navigate = useNavigate();

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="text-center items-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
            <Clock className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="text-xl">Free Trial Ended</DialogTitle>
          <DialogDescription className="text-center pt-2">
            Your free trial session has ended. Upgrade to access full product creation, downloads, and analytics.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-4">
          <Button onClick={() => navigate("/pricing")} className="gap-2">
            <Crown className="w-4 h-4" />
            Upgrade Now
          </Button>
          <Button variant="outline" onClick={() => navigate("/")}>
            Back to Home
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TrialExpiredModal;
