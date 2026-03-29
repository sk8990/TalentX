import { Navigate, useLocation } from "react-router-dom";

export default function ProtectedRoute({ children, role }) {
  const location = useLocation();
  const token = localStorage.getItem("token");

  let user = null;
  try {
    const raw = localStorage.getItem("user");
    user = raw ? JSON.parse(raw) : null;
  } catch {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    return <Navigate to="/" replace />;
  }

  if (!token || !user) {
    return <Navigate to="/" replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to="/" replace />;
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
