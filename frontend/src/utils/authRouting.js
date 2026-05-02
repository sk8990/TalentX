const LOGIN_ROUTE = "/login";
const PUBLIC_ROUTES = ["/", LOGIN_ROUTE, "/register", "/forgot-password"];

export function clearStoredAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("talentx_subscription");
}

/**
 * Decode a JWT and check whether it has expired.
 * Returns true when the token is missing, malformed, or its `exp` claim is in the past.
 */
function isTokenExpired(token) {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (!payload.exp) return false;           // no exp → treat as non-expiring
    return payload.exp * 1000 < Date.now();   // exp is in seconds
  } catch {
    return true;                              // malformed → treat as expired
  }
}

export function readStoredSession() {
  const token = localStorage.getItem("token");

  // If the token is expired / missing, wipe everything and return early
  if (isTokenExpired(token)) {
    clearStoredAuth();
    return { token: null, user: null };
  }

  let user = null;
  try {
    const raw = localStorage.getItem("user");
    user = raw ? JSON.parse(raw) : null;
  } catch {
    clearStoredAuth();
    return { token: null, user: null };
  }

  return { token, user };
}

export function getDefaultRouteForUser(user) {
  if (!user?.role) {
    return LOGIN_ROUTE;
  }

  if (user.role === "super_admin") {
    return "/super-admin/dashboard";
  }

  if (user.role === "student") {
    return "/student/dashboard";
  }

  if (user.role === "recruiter") {
    return "/recruiter/dashboard";
  }

  if (user.role === "college_admin") {
    return "/college-admin/dashboard";
  }

  if (user.role === "admin" || user.role === "university_admin") {
    return "/admin/dashboard";
  }

  if (user.role === "interviewer") {
    return user.forcePasswordReset ? "/interviewer/reset-password" : "/interviewer/dashboard";
  }

  return LOGIN_ROUTE;
}

export function getStoredRedirectPath() {
  const { token, user } = readStoredSession();
  if (!token || !user) {
    return null;
  }

  return getDefaultRouteForUser(user);
}

export { LOGIN_ROUTE, PUBLIC_ROUTES };
