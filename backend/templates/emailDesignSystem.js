"use strict";

// ── TalentX Email Design System ─────────────────────────────────────────────
// Responsive, table-based HTML email templates with inline CSS.
// Compatible with Mailpit (development) and Brevo (production).
//
// Brand tokens:
//   Primary: #6C63FF | Secondary: #4F46E5 | Accent: #22C55E
//   Background: #F8FAFC | Card: #FFFFFF
//   Text: #1F2937 | Muted: #6B7280
//   Font: Arial, Helvetica, sans-serif

// ── Utilities ───────────────────────────────────────────────────────────────

function esc(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function currentYear() {
  return new Date().getFullYear();
}

function getSupportEmail() {
  return String(process.env.SUPPORT_EMAIL || "support@talentx.com").trim();
}

// ── Shared HTML Layout ──────────────────────────────────────────────────────

function layout(subject, preheader, bodyHtml) {
  const se = esc(getSupportEmail());
  const yr = currentYear();

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>${esc(subject)}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<!-- Preheader text (hidden) -->
<div style="display:none;font-size:1px;color:#F8FAFC;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
${esc(preheader)}&#8199;&#65279;&#847; &#8199;&#65279;&#847; &#8199;&#65279;&#847;
</div>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F8FAFC;">
<tr><td align="center" style="padding:32px 16px 16px;">

<!-- Container 600px -->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;">

<!-- ====== HEADER ====== -->
<tr>
<td align="center" style="background-color:#6C63FF;padding:30px 24px;border-radius:12px 12px 0 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr><td align="center">
<p style="margin:0;font-size:28px;font-weight:700;color:#FFFFFF;font-family:Arial,Helvetica,sans-serif;letter-spacing:-0.5px;">TalentX</p>
<p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,0.7);font-family:Arial,Helvetica,sans-serif;letter-spacing:0.3px;">Your Career, Accelerated</p>
</td></tr>
</table>
</td>
</tr>

<!-- Accent divider -->
<tr><td style="background-color:#4F46E5;height:3px;font-size:0;line-height:0;">&nbsp;</td></tr>

<!-- ====== BODY ====== -->
<tr>
<td style="background-color:#FFFFFF;padding:36px 32px 28px;">
${bodyHtml}
</td>
</tr>

<!-- ====== FOOTER ====== -->
<tr>
<td style="background-color:#FFFFFF;padding:0 32px 28px;border-radius:0 0 12px 12px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
<tr><td style="border-top:1px solid #E5E7EB;padding-top:20px;text-align:center;">
<p style="margin:0 0 6px;font-size:12px;color:#6B7280;font-family:Arial,Helvetica,sans-serif;">
Need help? Contact us at <a href="mailto:${se}" style="color:#6C63FF;text-decoration:underline;">${se}</a>
</p>
<p style="margin:0;font-size:12px;color:#9CA3AF;font-family:Arial,Helvetica,sans-serif;">
&copy; ${yr} TalentX. All rights reserved.
</p>
</td></tr>
</table>
</td>
</tr>

</table>
<!-- /Container -->

</td></tr>
</table>
</body>
</html>`;
}

// ── Reusable Components ─────────────────────────────────────────────────────

function badge(text, bg, fg) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;">
<tr><td style="background-color:${bg};color:${fg};font-size:11px;font-weight:700;padding:5px 14px;border-radius:20px;font-family:Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:0.5px;">${esc(text)}</td></tr>
</table>`;
}

function heading(text) {
  return `<h1 style="margin:0 0 6px;font-size:24px;font-weight:700;color:#1F2937;font-family:Arial,Helvetica,sans-serif;line-height:1.3;">${esc(text)}</h1>`;
}

function accentBar() {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0 20px;">
<tr><td style="width:48px;height:3px;background-color:#6C63FF;border-radius:2px;font-size:0;line-height:0;">&nbsp;</td></tr>
</table>`;
}

function paragraph(text, opts) {
  const muted = opts && opts.muted;
  const small = opts && opts.small;
  const color = muted ? "#6B7280" : "#1F2937";
  const size = small ? "13px" : "15px";
  return `<p style="margin:0 0 16px;font-size:${size};color:${color};font-family:Arial,Helvetica,sans-serif;line-height:1.6;">${esc(text)}</p>`;
}

function ctaButton(url, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 8px;">
<tr>
<td align="center" style="border-radius:8px;background-color:#6C63FF;">
<!--[if mso]><i style="letter-spacing:36px;mso-font-width:-100%;mso-text-raise:24pt">&nbsp;</i><![endif]-->
<a href="${esc(url)}" target="_blank" style="display:inline-block;padding:14px 36px;font-size:16px;font-weight:600;color:#FFFFFF;font-family:Arial,Helvetica,sans-serif;text-decoration:none;border-radius:8px;background-color:#6C63FF;">
${esc(label)}
</a>
<!--[if mso]><i style="letter-spacing:36px;mso-font-width:-100%">&nbsp;</i><![endif]-->
</td>
</tr>
</table>`;
}

function fallbackLink(url) {
  return `<p style="margin:0 0 16px;font-size:12px;color:#6B7280;font-family:Arial,Helvetica,sans-serif;">
If the button doesn&#39;t work, copy this URL:
<a href="${esc(url)}" style="color:#6C63FF;text-decoration:underline;word-break:break-all;">${esc(url)}</a>
</p>`;
}

function otpBox(code) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:24px 0;">
<tr>
<td align="center" style="background-color:#F0EFFF;border:2px dashed #6C63FF;border-radius:12px;padding:24px 16px;">
<p style="margin:0;font-size:36px;font-weight:700;color:#4F46E5;font-family:'Courier New',Courier,monospace;letter-spacing:8px;">${esc(code)}</p>
</td>
</tr>
</table>`;
}

function detailsTable(rows) {
  let html = "";
  for (let i = 0; i < rows.length; i++) {
    const label = rows[i][0];
    const value = rows[i][1];
    const bg = i % 2 === 0 ? "#F9FAFB" : "#FFFFFF";
    const borderBottom = i < rows.length - 1 ? "border-bottom:1px solid #F3F4F6;" : "";
    html += `<tr>
<td style="padding:11px 16px;font-size:13px;color:#6B7280;font-family:Arial,Helvetica,sans-serif;font-weight:600;background-color:${bg};${borderBottom}white-space:nowrap;width:120px;">${esc(label)}</td>
<td style="padding:11px 16px;font-size:14px;color:#1F2937;font-family:Arial,Helvetica,sans-serif;background-color:${bg};${borderBottom}">${esc(value)}</td>
</tr>`;
  }
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:20px 0;border:1px solid #E5E7EB;border-radius:8px;border-collapse:separate;overflow:hidden;">
${html}
</table>`;
}

function infoNote(text) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:16px 0 0;">
<tr>
<td style="background-color:#F0F9FF;border-left:3px solid #6C63FF;padding:12px 16px;border-radius:0 6px 6px 0;">
<p style="margin:0;font-size:13px;color:#6B7280;font-family:Arial,Helvetica,sans-serif;line-height:1.5;">${esc(text)}</p>
</td>
</tr>
</table>`;
}

// ── Plain Text Builder ──────────────────────────────────────────────────────

function buildPlainText(lines) {
  const se = getSupportEmail();
  const yr = currentYear();
  return [
    ...lines.filter(function (l) { return l !== null && l !== undefined; }),
    "",
    "---",
    "Need help? Contact us at " + se,
    "(c) " + yr + " TalentX. All rights reserved.",
  ].join("\n");
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

// ── 1) Welcome Email ────────────────────────────────────────────────────────
// Placeholders: {{name}}, {{dashboard_url}}, {{support_email}}, {{year}}

function welcomeEmail({ name, dashboardUrl }) {
  const subject = "Welcome to TalentX!";
  const preheader = "Your account has been created successfully. Get started now!";

  const body = [
    badge("Account Created", "#ECFDF5", "#16A34A"),
    heading("Welcome to TalentX!"),
    accentBar(),
    paragraph("Hi " + (name || "there") + ","),
    paragraph("Your account has been created successfully. We\u2019re excited to have you on board!"),
    paragraph("Get started by visiting your dashboard to complete your profile and explore opportunities."),
    ctaButton(dashboardUrl || "#", "Go to Dashboard"),
    fallbackLink(dashboardUrl || "#"),
  ].join("\n");

  const text = buildPlainText([
    "WELCOME TO TALENTX!",
    "",
    "Hi " + (name || "there") + ",",
    "",
    "Your account has been created successfully.",
    "We're excited to have you on board!",
    "",
    "Get started by visiting your dashboard:",
    dashboardUrl || "[Dashboard URL]",
  ]);

  return { subject: subject, html: layout(subject, preheader, body), text: text };
}

// ── 2) OTP Verification Email ───────────────────────────────────────────────
// Placeholders: {{name}}, {{otp}}, {{support_email}}, {{year}}

function otpVerificationEmail({ name, otp }) {
  const subject = "Verify Your Email - TalentX";
  const preheader = "Your verification code is ready. It expires in 10 minutes.";

  const body = [
    badge("Verification Required", "#F0EFFF", "#6C63FF"),
    heading("Verify Your Email"),
    accentBar(),
    paragraph("Hi " + (name || "there") + ","),
    paragraph("Use the OTP below to verify your account:"),
    otpBox(otp || "------"),
    infoNote("This OTP expires in 10 minutes. Do not share this code with anyone."),
    '<p style="margin:20px 0 0;font-size:13px;color:#6B7280;font-family:Arial,Helvetica,sans-serif;line-height:1.5;">If you did not request this verification, please ignore this email.</p>',
  ].join("\n");

  const text = buildPlainText([
    "VERIFY YOUR EMAIL",
    "",
    "Hi " + (name || "there") + ",",
    "",
    "Use the OTP below to verify your account:",
    "",
    "  " + (otp || "------"),
    "",
    "This OTP expires in 10 minutes.",
    "Do not share this code with anyone.",
    "",
    "If you did not request this verification, please ignore this email.",
  ]);

  return { subject: subject, html: layout(subject, preheader, body), text: text };
}

// ── 3) Password Reset Email ─────────────────────────────────────────────────
// Placeholders: {{name}}, {{reset_url}}, {{support_email}}, {{year}}

function passwordResetEmail({ name, resetUrl }) {
  const subject = "Reset Your Password - TalentX";
  const preheader = "We received a request to reset your password.";

  const body = [
    badge("Action Required", "#FEF3C7", "#D97706"),
    heading("Reset Your Password"),
    accentBar(),
    paragraph("Hi " + (name || "there") + ","),
    paragraph("We received a request to reset your password. Click the button below to create a new password:"),
    ctaButton(resetUrl || "#", "Reset Password"),
    fallbackLink(resetUrl || "#"),
    infoNote("If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged."),
  ].join("\n");

  const text = buildPlainText([
    "RESET YOUR PASSWORD",
    "",
    "Hi " + (name || "there") + ",",
    "",
    "We received a request to reset your password.",
    "Click the link below to create a new password:",
    "",
    resetUrl || "[Reset URL]",
    "",
    "If you did not request a password reset, you can safely ignore this email.",
    "Your password will remain unchanged.",
  ]);

  return { subject: subject, html: layout(subject, preheader, body), text: text };
}

// ── 4) Interview Invitation Email ───────────────────────────────────────────
// Placeholders: {{candidate_name}}, {{company_name}}, {{job_role}},
//               {{interview_date}}, {{interview_time}}, {{interview_mode}},
//               {{interview_url}}, {{support_email}}, {{year}}

function interviewInvitationEmail({
  candidateName,
  companyName,
  jobRole,
  interviewDate,
  interviewTime,
  interviewMode,
  interviewUrl,
}) {
  const role = jobRole || "Open Position";
  const company = companyName || "Company";
  const subject = "Interview Invitation: " + role + " at " + company;
  const preheader = "You\u2019ve been invited to interview for " + role + " at " + company + ".";

  const body = [
    badge("New Invitation", "#EFF6FF", "#2563EB"),
    heading("Interview Invitation"),
    accentBar(),
    paragraph("Hi " + (candidateName || "Candidate") + ","),
    paragraph("You have been invited for an interview. Please review the details below:"),
    detailsTable([
      ["Company", company],
      ["Role", role],
      ["Date", interviewDate || "\u2014"],
      ["Time", interviewTime || "\u2014"],
      ["Mode", interviewMode || "\u2014"],
    ]),
    ctaButton(interviewUrl || "#", "View Interview Details"),
    fallbackLink(interviewUrl || "#"),
    infoNote("Please make sure to join on time. If you have any questions, contact us via the support email below."),
  ].join("\n");

  const text = buildPlainText([
    "INTERVIEW INVITATION",
    "",
    "Hi " + (candidateName || "Candidate") + ",",
    "",
    "You have been invited for an interview.",
    "",
    "Company:  " + company,
    "Role:     " + role,
    "Date:     " + (interviewDate || "-"),
    "Time:     " + (interviewTime || "-"),
    "Mode:     " + (interviewMode || "-"),
    "",
    "View interview details:",
    interviewUrl || "[Interview URL]",
    "",
    "Please make sure to join on time.",
  ]);

  return { subject: subject, html: layout(subject, preheader, body), text: text };
}

module.exports = {
  welcomeEmail,
  otpVerificationEmail,
  passwordResetEmail,
  interviewInvitationEmail,
};
