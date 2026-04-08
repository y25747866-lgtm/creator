import { useNavigate } from "react-router-dom";
import { Lock, AlertCircle } from "lucide-react";

interface UpgradeOverlayProps {
  message?: string;
}

export const UpgradeOverlay = ({ message }: UpgradeOverlayProps) => {
  const navigate = useNavigate();
  
  const { hasPaidSubscription, subscription } = useSubscription();

  const isExpired = subscription?.status === "expired";

  if (hasPaidSubscription && !isExpired) return null;

  const title = isExpired ? "Subscription Expired" : "View-Only Mode";
  const defaultMessage = isExpired
    ? "Your subscription has expired. Renew your plan to continue using premium features."
    : "The Sales Page Builder is available on Creator and Pro plans. Upgrade to start generating high-converting sales pages.";

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center rounded-xl" style={{ background: 'rgba(10,10,10,0.7)', backdropFilter: 'blur(8px)' }}>
      <div className="text-center space-y-4 p-8 max-w-md">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto" style={{ background: '#1A1A1A', border: '1px solid #222222' }}>
          {isExpired ? (
            <AlertCircle className="w-8 h-8" style={{ color: '#FFFFFF', opacity: 0.3 }} />
          ) : (
            <Lock className="w-8 h-8" style={{ color: '#FFFFFF', opacity: 0.3 }} />
          )}
        </div>
        <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: '18px', fontWeight: 700, color: '#FFFFFF' }}>{title}</h3>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px', color: '#555555' }}>
          {message || defaultMessage}
        </p>
        <button
          onClick={() => navigate("/pricing")}
          style={{
            background: '#FFFFFF',
            color: '#0A0A0A',
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: '14px',
            padding: '10px 24px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            transition: 'background 150ms',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#F0F0F0'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
        >
          {isExpired ? "Renew Now" : "Upgrade Now"}
        </button>
      </div>
    </div>
  );
};

import { useSubscription } from "@/hooks/useSubscription";

export default UpgradeOverlay;
