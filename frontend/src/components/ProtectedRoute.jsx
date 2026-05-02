import { Navigate, useLocation } from "react-router-dom";
import { getDefaultRouteForUser, LOGIN_ROUTE, readStoredSession } from "../utils/authRouting";

function getAllowedRoles(requiredRole) {
  if (!requiredRole) {
    return new Set();
  }

  const roleList = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  return new Set(roleList);
}

export default function ProtectedRoute({ children, role }) {
  const location = useLocation();
  const { token, user } = readStoredSession();

  if (!token || !user) {
    return <Navigate to={LOGIN_ROUTE} replace />;
  }

  const allowedRoles = getAllowedRoles(role);
  if (allowedRoles.size > 0 && !allowedRoles.has(user.role)) {
    return <Navigate to={getDefaultRouteForUser(user) || LOGIN_ROUTE} replace />;
  }

  if (user.role === "interviewer") {
    const mustReset = Boolean(user.forcePasswordReset);
    const onResetPage = location.pathname === "/interviewer/reset-password";

    if (mustReset && !onResetPage) {
      return <Navigate to="/interviewer/reset-password" replace />;
    }

    if (!mustReset && onResetPage) {
      return <Navigate to="/interviewer/dashboard" replace />;
    }
  }

  return children;
}
