import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ViewableRouteProps {
  children: ReactNode;
  allowGuestPreview?: boolean;
}

/** Auth-only route guard for dashboard pages. */
const ViewableRoute = ({ children, allowGuestPreview = false }: ViewableRouteProps) => {
  const { session, loading } = useAuth();
  const location = useLocation();
  const redirect = `${location.pathname}${location.search}${location.hash}`;
  const canBrowsePreview = allowGuestPreview && location.pathname === "/dashboard";

  if (loading) return <div className="min-h-screen bg-[#080A0C]" aria-hidden="true" />;
  if (!session && !canBrowsePreview) return <Navigate to={`/auth/signin?redirect=${encodeURIComponent(redirect)}`} replace />;

  return <>{children}</>;
};

export default ViewableRoute;
