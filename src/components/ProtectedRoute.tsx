import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Skeleton } from "@/components/ui/skeleton";

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { hasActiveSubscription, loading: subLoading } = useSubscription();

  // Show loading state while checking auth and subscription
  if (authLoading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Skeleton role="status" aria-label="Checking access" className="h-24 w-64" />
      </div>
    );
  }

  // If not logged in, redirect to auth page
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If logged in but no active subscription, redirect to pricing
  if (!hasActiveSubscription) {
    return <Navigate to="/pricing" replace state={{ message: "You need an active plan to access this feature." }} />;
  }

  // User is authenticated and has active subscription
  return <>{children}</>;
};

export default ProtectedRoute;
