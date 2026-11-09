import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ViewableRouteProps {
  children: ReactNode;
}

const RouteSkeleton = () => (
  <div className="min-h-screen bg-[#080A0C] p-6" aria-label="Loading workspace">
    <div className="mx-auto max-w-6xl animate-pulse space-y-4">
      <div className="h-8 w-48 rounded-lg bg-white/[0.06]" />
      <div className="h-24 rounded-2xl bg-white/[0.04]" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-40 rounded-2xl bg-white/[0.04]" />
        <div className="h-40 rounded-2xl bg-white/[0.04]" />
      </div>
    </div>
  </div>
);

/** Auth-only route guard for dashboard pages. */
const ViewableRoute = ({ children }: ViewableRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const redirect = `${location.pathname}${location.search}${location.hash}`;

  if (loading) return <RouteSkeleton />;
  if (!user) return <Navigate to={`/auth/signin?redirect=${encodeURIComponent(redirect)}`} replace />;

  return <>{children}</>;
};

export default ViewableRoute;
