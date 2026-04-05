import { Navigate } from "react-router-dom";
import { getStoredRedirectPath } from "../utils/authRouting";

export default function PublicRoute({ children }) {
  const redirectPath = getStoredRedirectPath();

  if (redirectPath) {
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}
