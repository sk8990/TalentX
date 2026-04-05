import { Navigate, useLocation } from "react-router-dom";
import { getDefaultRouteForUser, LOGIN_ROUTE, readStoredSession } from "../utils/authRouting";

export default function ProtectedRoute({ children, role }) {
  const location = useLocation();
  const { token, user } = readStoredSession();

  if (!token || !user) {
    return <Navigate to={LOGIN_ROUTE} replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to={getDefaultRouteForUser(user)} replace />;
  }

  if (user.role === "interviewer") {
    const mustReset = Boolean(user.forcePasswordReset);
    const onResetPage = location.pathname === "/interviewer/reset-password";

    if (mustReset && !onResetPage) {
      return <Navigate to="/interviewer/reset-password" replace />;
    }

    if (!mustReset && onResetPage) {
      return <Navigate to="/interviewer" replace />;
    }
  }

  return children;
}
