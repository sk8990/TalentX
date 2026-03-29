const axios = require("axios");

const baseURL = String(process.env.SMOKE_BASE_URL || "http://localhost:5000").replace(/\/+$/, "");
const token = String(process.env.SMOKE_TOKEN || "").trim();

const checks = [
  {
    name: "Health endpoint",
    method: "get",
    path: "/api/health",
    expectedStatuses: [200],
  },
];

if (token) {
  checks.push({
    name: "Notifications endpoint (auth)",
    method: "get",
    path: "/api/notifications",
    expectedStatuses: [200],
    headers: { Authorization: `Bearer ${token}` },
  });
}

async function runCheck(check) {
  try {
    const response = await axios({
      baseURL,
      url: check.path,
      method: check.method,
      headers: check.headers,
      timeout: 10000,
      validateStatus: () => true,
    });

    const ok = check.expectedStatuses.includes(response.status);
    const marker = ok ? "PASS" : "FAIL";
    console.log(`${marker} | ${check.name} -> ${response.status}`);

    if (!ok) {
      console.log(`       Expected: ${check.expectedStatuses.join(", ")}`);
      console.log(`       Response:`, response.data);
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
  if (!token) {
    console.log("[SMOKE] SMOKE_TOKEN not provided, auth checks skipped.");
  }

  const results = await Promise.all(checks.map(runCheck));
  const failed = results.filter((ok) => !ok).length;

  if (failed > 0) {
    console.log(`[SMOKE] Completed with ${failed} failure(s).`);
    process.exit(1);
  }

  console.log("[SMOKE] All checks passed.");
}

main();
