import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getDefaultRouteForRole, requiresApprovalGate } from "../services/auth.service";
import type { UserRole } from "../types/user.types";

type ProtectedRouteProps = {
  allowedRoles?: UserRole[];
};

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isInitializing, user } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return <div className="route-state">Checking access...</div>;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getDefaultRouteForRole(user.role)} replace />;
  }

  if (location.pathname !== "/approval-status" && requiresApprovalGate(user)) {
    return <Navigate to="/approval-status" replace />;
  }

  return <Outlet />;
}
