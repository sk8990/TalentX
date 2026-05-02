import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import API from "../api/axios";
import { clearStoredAuth, getStoredRedirectPath, readStoredSession } from "../utils/authRouting";
import ScreenLoader from "./ScreenLoader";

export default function PublicRoute({ children }) {
  const { token } = readStoredSession();

  // No stored session at all → show the public page immediately
  if (!token) {
    return children;
  }

  // There IS a stored token – verify it against the server before redirecting
  return <VerifyAndRedirect>{children}</VerifyAndRedirect>;
}

/**
 * Calls GET /auth/verify to confirm the stored token is still valid.
 *  - If valid   → redirect to the user's dashboard
 *  - If invalid → clear localStorage and show the public page (login/register)
 */
function VerifyAndRedirect({ children }) {
  const [status, setStatus] = useState("checking"); // "checking" | "valid" | "invalid"

  useEffect(() => {
    let cancelled = false;

    API.get("/auth/verify")
      .then(() => {
        if (!cancelled) setStatus("valid");
      })
      .catch(() => {
        clearStoredAuth();
        if (!cancelled) setStatus("invalid");
      });

    return () => { cancelled = true; };
  }, []);

  if (status === "checking") {
    return (
      <ScreenLoader
        fullScreen
        showBrand
        message="Checking session..."
        subtext="Please wait a moment."
      />
    );
  }

  if (status === "valid") {
    const redirectPath = getStoredRedirectPath();
    if (redirectPath) {
      return <Navigate to={redirectPath} replace />;
    }
  }

  // status === "invalid" or no redirect path
  return children;
}
