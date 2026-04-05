const axios = require("axios");

const baseURL = String(process.env.SMOKE_BASE_URL || "http://localhost:5000").replace(/\/+$/, "");
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 10000);
const tokens = {
  student: String(process.env.SMOKE_STUDENT_TOKEN || process.env.SMOKE_TOKEN || "").trim(),
  recruiter: String(process.env.SMOKE_RECRUITER_TOKEN || "").trim(),
  interviewer: String(process.env.SMOKE_INTERVIEWER_TOKEN || "").trim(),
  admin: String(process.env.SMOKE_ADMIN_TOKEN || "").trim(),
};
const credentials = {
  student: {
    email: String(process.env.SMOKE_STUDENT_EMAIL || "").trim(),
    password: String(process.env.SMOKE_STUDENT_PASSWORD || ""),
  },
  recruiter: {
    email: String(process.env.SMOKE_RECRUITER_EMAIL || "").trim(),
    password: String(process.env.SMOKE_RECRUITER_PASSWORD || ""),
  },
  interviewer: {
    email: String(process.env.SMOKE_INTERVIEWER_EMAIL || "").trim(),
    password: String(process.env.SMOKE_INTERVIEWER_PASSWORD || ""),
  },
  admin: {
    email: String(process.env.SMOKE_ADMIN_EMAIL || "").trim(),
    password: String(process.env.SMOKE_ADMIN_PASSWORD || ""),
  },
};
let loginFailures = 0;

function withAuth(token) {
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

function buildRoleChecks(role, token, checks) {
  return checks.map((check) => ({
    ...check,
    name: `[${role}] ${check.name}`,
    headers: {
      ...(check.headers || {}),
      ...withAuth(token),
    },
  }));
}

const checks = [
  {
    name: "Health endpoint",
    method: "get",
    path: "/api/health",
    expectedStatuses: [200],
  },
  {
    name: "Notifications requires auth",
    method: "get",
    path: "/api/notifications",
    expectedStatuses: [401],
  },
  {
    name: "Student profile requires auth",
    method: "get",
    path: "/api/student/profile",
    expectedStatuses: [401],
  },
  {
    name: "Recruiter stats requires auth",
    method: "get",
    path: "/api/recruiter/stats",
    expectedStatuses: [401],
  },
  {
    name: "Interviewer interviews requires auth",
    method: "get",
    path: "/api/interviewer/interviews",
    expectedStatuses: [401],
  },
  {
    name: "Admin stats requires auth",
    method: "get",
    path: "/api/admin/stats",
    expectedStatuses: [401],
  },
];

const roleChecks = {
  student: [
    {
      name: "Profile",
      method: "get",
      path: "/api/student/profile",
      expectedStatuses: [200, 404],
    },
    {
      name: "Dashboard",
      method: "get",
      path: "/api/student/dashboard",
      expectedStatuses: [200, 404],
    },
    {
      name: "Recommendations",
      method: "get",
      path: "/api/student/recommendations",
      expectedStatuses: [200, 404],
    },
    {
      name: "Jobs feed",
      method: "get",
      path: "/api/jobs/student",
      expectedStatuses: [200, 404],
    },
    {
      name: "My applications",
      method: "get",
      path: "/api/application/my",
      expectedStatuses: [200, 404],
    },
    {
      name: "My interviews",
      method: "get",
      path: "/api/application/my/interviews",
      expectedStatuses: [200, 404],
    },
    {
      name: "My interview slots",
      method: "get",
      path: "/api/application/my/interview-slots",
      expectedStatuses: [200, 404],
    },
    {
      name: "My assessments",
      method: "get",
      path: "/api/application/my/assessments",
      expectedStatuses: [200, 404],
    },
    {
      name: "My support tickets",
      method: "get",
      path: "/api/support/my",
      expectedStatuses: [200],
    },
    {
      name: "Notifications",
      method: "get",
      path: "/api/notifications",
      expectedStatuses: [200],
    },
    {
      name: "Recruiter route blocked",
      method: "get",
      path: "/api/recruiter/stats",
      expectedStatuses: [403],
    },
  ],
  recruiter: [
    {
      name: "Recruiter stats",
      method: "get",
      path: "/api/recruiter/stats",
      expectedStatuses: [200],
    },
    {
      name: "Recruiter applications",
      method: "get",
      path: "/api/recruiter/applications",
      expectedStatuses: [200],
    },
    {
      name: "Recruiter interviewers",
      method: "get",
      path: "/api/recruiter/interviewers",
      expectedStatuses: [200],
    },
    {
      name: "Company list",
      method: "get",
      path: "/api/company/list",
      expectedStatuses: [200],
    },
    {
      name: "Recruiter jobs",
      method: "get",
      path: "/api/company/recruiter/jobs",
      expectedStatuses: [200],
    },
    {
      name: "Recruiter support tickets",
      method: "get",
      path: "/api/support/recruiter/my",
      expectedStatuses: [200],
    },
    {
      name: "Notifications",
      method: "get",
      path: "/api/notifications",
      expectedStatuses: [200],
    },
    {
      name: "Admin route blocked",
      method: "get",
      path: "/api/admin/stats",
      expectedStatuses: [403],
    },
  ],
  interviewer: [
    {
      name: "Assigned interviews",
      method: "get",
      path: "/api/interviewer/interviews",
      expectedStatuses: [200],
    },
    {
      name: "Notifications",
      method: "get",
      path: "/api/notifications",
      expectedStatuses: [200],
    },
    {
      name: "Admin route blocked",
      method: "get",
      path: "/api/admin/stats",
      expectedStatuses: [403],
    },
  ],
  admin: [
    {
      name: "Platform stats",
      method: "get",
      path: "/api/admin/stats",
      expectedStatuses: [200],
    },
    {
      name: "Users",
      method: "get",
      path: "/api/admin/users",
      expectedStatuses: [200],
    },
    {
      name: "Jobs",
      method: "get",
      path: "/api/admin/jobs",
      expectedStatuses: [200],
    },
    {
      name: "Selected candidates",
      method: "get",
      path: "/api/admin/selected-candidates",
      expectedStatuses: [200],
    },
    {
      name: "Pending recruiters",
      method: "get",
      path: "/api/admin/pending-recruiters",
      expectedStatuses: [200],
    },
    {
      name: "Support tickets",
      method: "get",
      path: "/api/support/admin",
      expectedStatuses: [200],
    },
    {
      name: "Notifications",
      method: "get",
      path: "/api/notifications",
      expectedStatuses: [200],
    },
    {
      name: "Recruiter route blocked",
      method: "get",
      path: "/api/recruiter/stats",
      expectedStatuses: [403],
    },
  ],
};

async function resolveRoleToken(role) {
  if (tokens[role]) {
    return tokens[role];
  }

  const email = credentials[role]?.email;
  const password = credentials[role]?.password;
  if (!email && !password) {
    return "";
  }

  if (!email || !password) {
    console.log(`[SMOKE] Skipping ${role} auto-login because credentials are incomplete.`);
    return "";
  }

  try {
    const response = await axios({
      baseURL,
      url: "/api/auth/login",
      method: "post",
      timeout: timeoutMs,
      validateStatus: () => true,
      data: { email, password },
    });

    if (response.status !== 200 || !response.data?.token) {
      console.log(`[SMOKE] ${role} auto-login failed -> ${response.status}`);
      console.log("       Response:", response.data);
      loginFailures += 1;
      return "";
    }

    console.log(`[SMOKE] ${role} auto-login passed.`);
    return String(response.data.token || "").trim();
  } catch (err) {
    console.log(`[SMOKE] ${role} auto-login failed -> ${err.message}`);
    loginFailures += 1;
    return "";
  }
}

async function runCheck(check) {
  try {
    const response = await axios({
      baseURL,
      url: check.path,
      method: check.method,
      headers: check.headers,
      timeout: timeoutMs,
      validateStatus: () => true,
    });

    const ok = check.expectedStatuses.includes(response.status);
    const marker = ok ? "PASS" : "FAIL";
    console.log(`${marker} | ${check.name} -> ${response.status}`);

    if (!ok) {
      console.log(`       Expected: ${check.expectedStatuses.join(", ")}`);
      console.log("       Response:", response.data);
      return false;
    }

    return true;
  } catch (err) {
    console.log(`FAIL | ${check.name} -> ${err.message}`);
    return false;
  }
}

async function main() {
  console.log(`[SMOKE] Base URL: ${baseURL}`);
  console.log(`[SMOKE] Timeout: ${timeoutMs}ms`);

  const resolvedTokens = {};
  for (const role of Object.keys(tokens)) {
    resolvedTokens[role] = await resolveRoleToken(role);
    if (resolvedTokens[role]) {
      checks.push(...buildRoleChecks(role, resolvedTokens[role], roleChecks[role]));
    }
  }

  const enabledRoles = Object.entries(resolvedTokens)
    .filter(([, token]) => Boolean(token))
    .map(([role]) => role);
  const skippedRoles = Object.keys(resolvedTokens).filter((role) => !resolvedTokens[role]);

  console.log(
    enabledRoles.length
      ? `[SMOKE] Role auth loaded: ${enabledRoles.join(", ")}`
      : "[SMOKE] No role tokens or credentials provided. Running public/auth-guard checks only."
  );

  if (skippedRoles.length > 0) {
    console.log(`[SMOKE] Skipping role-specific checks for: ${skippedRoles.join(", ")}`);
  }

  const results = await Promise.all(checks.map(runCheck));
  const failed = results.filter((ok) => !ok).length + loginFailures;

  if (failed > 0) {
    console.log(`[SMOKE] Completed with ${failed} failure(s).`);
    process.exit(1);
  }

  console.log("[SMOKE] All checks passed.");
}

main();
