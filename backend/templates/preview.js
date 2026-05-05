"use strict";

// ── Email Template Preview Server ───────────────────────────────────────────
// Run: node backend/templates/preview.js
// Opens at: http://localhost:3099
// Lists all 4 TalentX email templates with sample data for visual QA.

const http = require("http");
const {
  welcomeEmail,
  otpVerificationEmail,
  passwordResetEmail,
  interviewInvitationEmail,
} = require("./emailDesignSystem");

const PORT = 3099;

const samples = {
  welcome: welcomeEmail({
    name: "Sarah Johnson",
    dashboardUrl: "https://app.talentx.com/dashboard",
  }),
  otp: otpVerificationEmail({
    name: "Sarah Johnson",
    otp: "847291",
  }),
  "password-reset": passwordResetEmail({
    name: "Sarah Johnson",
    resetUrl: "https://app.talentx.com/reset-password?token=abc123xyz",
  }),
  "interview-invitation": interviewInvitationEmail({
    candidateName: "Sarah Johnson",
    companyName: "Acme Technologies",
    jobRole: "Senior Frontend Engineer",
    interviewDate: "January 20, 2026",
    interviewTime: "10:00 AM IST",
    interviewMode: "Online (Google Meet)",
    interviewUrl: "https://app.talentx.com/interviews/inv-9a3f",
  }),
};

function indexPage() {
  const links = Object.keys(samples)
    .map(
      (key) =>
        `<li style="margin:8px 0;"><a href="/${key}" style="color:#6C63FF;font-size:16px;">${samples[key].subject}</a>
          &nbsp;<a href="/${key}?format=text" style="color:#6B7280;font-size:13px;">[plain text]</a></li>`
    )
    .join("");

  return `<!DOCTYPE html><html><head><title>TalentX Email Preview</title></head>
<body style="font-family:Arial,sans-serif;max-width:640px;margin:40px auto;padding:0 16px;">
<h1 style="color:#1F2937;">TalentX Email Preview</h1>
<p style="color:#6B7280;">Click a template to preview it.</p>
<ul style="list-style:none;padding:0;">${links}</ul>
</body></html>`;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname.replace(/^\//, "");
  const format = url.searchParams.get("format");

  if (!path) {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(indexPage());
    return;
  }

  const sample = samples[path];
  if (!sample) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Template not found. Available: " + Object.keys(samples).join(", "));
    return;
  }

  if (format === "text") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(sample.text);
  } else {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(sample.html);
  }
});

server.listen(PORT, () => {
  console.log(`\n  TalentX Email Preview: http://localhost:${PORT}\n`);
  console.log("  Templates:");
  Object.keys(samples).forEach((key) => {
    console.log(`    - http://localhost:${PORT}/${key}`);
  });
  console.log();
});
