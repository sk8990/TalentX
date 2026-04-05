const LOGIN_ROUTE = "/login";
const PUBLIC_ROUTES = ["/", LOGIN_ROUTE, "/register", "/forgot-password"];

export function clearStoredAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function readStoredSession() {
  const token = localStorage.getItem("token");

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

  if (user.role === "student") {
    return "/student/jobs";
  }

  if (user.role === "recruiter") {
    return "/recruiter";
  }

  if (user.role === "admin") {
    return "/admin";
  }

  if (user.role === "interviewer") {
    return user.forcePasswordReset ? "/interviewer/reset-password" : "/interviewer";
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
