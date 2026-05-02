const nodemailer = require("nodemailer");

let transporter = null;

function readEmailConfig() {
  const host = String(process.env.EMAIL_HOST || process.env.SMTP_HOST || "").trim();
  const port = Number(process.env.EMAIL_PORT || process.env.SMTP_PORT || 587);
  const user = String(process.env.EMAIL_USER || process.env.SMTP_USER || "").trim();
  const pass = String(process.env.EMAIL_PASS || process.env.SMTP_PASS || "");
  const from = String(
    process.env.EMAIL_FROM ||
    process.env.SMTP_FROM ||
    (user ? `TalentX <${user}>` : "TalentX <noreply@talentx.com>")
  ).trim();
  const secure = String(process.env.EMAIL_SECURE || process.env.SMTP_SECURE || "false")
    .trim()
    .toLowerCase() === "true";

  return { host, port: Number.isFinite(port) ? port : 587, user, pass, from, secure };
}

function isEmailConfigured(config = readEmailConfig()) {
  return Boolean(config.host && config.user && config.pass);
}

function safeEmailError(err) {
  const message = String(err?.message || err || "Email send failed");
  return message
    .replaceAll(process.env.EMAIL_PASS || "__NO_EMAIL_PASS__", "[redacted]")
    .replaceAll(process.env.SMTP_PASS || "__NO_SMTP_PASS__", "[redacted]");
}

function getLoginUrl(path = "/login") {
  const base = String(process.env.FRONTEND_URL || "http://localhost:3000")
    .trim()
    .replace(/\/+$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function buildTransporter(config) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    }
  });
}

async function getTransporter() {
  const config = readEmailConfig();
  if (!isEmailConfigured(config)) {
    return { transporter: null, config };
  }

  if (!transporter) {
    transporter = buildTransporter(config);
  }

  return { transporter, config };
}

async function sendEmail({ to, subject, html, text }) {
  try {
    const normalizedTo = String(to || "").trim();
    const normalizedSubject = String(subject || "").trim();
    if (!normalizedTo || !normalizedSubject) {
      return { success: false, error: "Email recipient and subject are required" };
    }

    const { transporter: activeTransporter, config } = await getTransporter();
    if (!activeTransporter) {
      console.warn("[EMAIL] Email not sent: SMTP not configured");
      return { success: false, error: "SMTP not configured", skipped: true };
    }

    const info = await activeTransporter.sendMail({
      from: config.from,
      to: normalizedTo,
      subject: normalizedSubject,
      html,
      text
    });

    const messageId = String(info?.messageId || "");
    console.info(`[EMAIL] Email sent: ${messageId || "message accepted"}`);
    return { success: true, messageId };
  } catch (err) {
    const error = safeEmailError(err);
    console.error(`[EMAIL] Email send failed: ${error}`);
    return { success: false, error };
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderEmail({ title, intro, lines = [], ctaUrl, ctaLabel = "Open TalentX" }) {
  const safeTitle = escapeHtml(title);
  const safeIntro = escapeHtml(intro);
  const safeCtaUrl = escapeHtml(ctaUrl);
  const safeCtaLabel = escapeHtml(ctaLabel);
  const htmlLines = lines
    .filter((line) => line !== undefined && line !== null && String(line).trim())
    .map((line) => `<p style="margin: 0 0 12px; color: #334155;">${escapeHtml(line)}</p>`)
    .join("");

  return `
    <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; color: #0f172a;">
      <div style="border-radius: 14px; background: #243b95; padding: 24px; color: #ffffff;">
        <h1 style="margin: 0; font-size: 24px;">${safeTitle}</h1>
        <p style="margin: 8px 0 0; color: #dbeafe;">TalentX University Recruitment Portal</p>
      </div>
      <div style="padding: 24px 0;">
        <p style="margin: 0 0 16px; color: #334155;">${safeIntro}</p>
        ${htmlLines}
        ${ctaUrl ? `
          <p style="margin: 24px 0;">
            <a href="${safeCtaUrl}" style="display: inline-block; border-radius: 10px; background: #243b95; color: #ffffff; padding: 12px 18px; text-decoration: none; font-weight: 700;">${safeCtaLabel}</a>
          </p>
          <p style="margin: 0; color: #64748b; font-size: 13px;">Login URL: <a href="${safeCtaUrl}">${safeCtaUrl}</a></p>
        ` : ""}
      </div>
      <div style="border-top: 1px solid #e2e8f0; padding-top: 14px; color: #94a3b8; font-size: 12px;">
        TalentX - Your Career, Accelerated.
      </div>
    </div>
  `;
}

function renderText({ title, intro, lines = [], ctaUrl }) {
  return [
    title,
    "",
    intro,
    ...lines.filter(Boolean),
    ctaUrl ? `Login URL: ${ctaUrl}` : "",
    "",
    "TalentX - Your Career, Accelerated."
  ].filter((line) => line !== "").join("\n");
}

function template({ subject, title, intro, lines, loginUrl, ctaLabel }) {
  return {
    subject,
    html: renderEmail({ title, intro, lines, ctaUrl: loginUrl, ctaLabel }),
    text: renderText({ title, intro, lines, ctaUrl: loginUrl })
  };
}

const emailTemplates = {
  collegeAdminCreatedEmail({ name, email, password, loginUrl = getLoginUrl() }) {
    return template({
      subject: "TalentX account created - College Admin",
      title: "TalentX account created",
      intro: `Hello ${name || "College Admin"}, your College Admin account has been created.`,
      lines: [
        `Login email: ${email}`,
        password ? `Temporary password: ${password}` : "",
        "Please change your password after your first login if prompted."
      ],
      loginUrl,
      ctaLabel: "Log in to TalentX"
    });
  },

  openStudentWelcomeEmail({ name, email, loginUrl = getLoginUrl() }) {
    return template({
      subject: "Welcome to TalentX",
      title: "Welcome to TalentX",
      intro: `Hi ${name || "Student"}, your TalentX account is ready.`,
      lines: [
        `Account email: ${email}`,
        "You can now browse open and off-campus job opportunities."
      ],
      loginUrl,
      ctaLabel: "Browse Jobs"
    });
  },

  collegeStudentPendingEmail({ name, email, collegeName, loginUrl = getLoginUrl() }) {
    return template({
      subject: "TalentX registration received",
      title: "Registration received",
      intro: `Hi ${name || "Student"}, your college student registration has been received.`,
      lines: [
        `Account email: ${email}`,
        `College: ${collegeName || "Your college"}`,
        "Your College Admin needs to approve your account before full college access is activated."
      ],
      loginUrl,
      ctaLabel: "View Account"
    });
  },

  collegeStudentApprovedEmail({ name, email, collegeName, loginUrl = getLoginUrl() }) {
    return template({
      subject: "TalentX college access approved",
      title: "College access activated",
      intro: `Hi ${name || "Student"}, your TalentX college student account has been approved.`,
      lines: [
        `Account email: ${email}`,
        `College: ${collegeName || "Your college"}`,
        "Your college access is now active."
      ],
      loginUrl,
      ctaLabel: "Log in to TalentX"
    });
  },

  recruiterPendingEmail({ name, email, loginUrl = getLoginUrl() }) {
    return template({
      subject: "TalentX recruiter registration received",
      title: "Recruiter registration received",
      intro: `Hello ${name || "Recruiter"}, your recruiter registration has been received.`,
      lines: [
        `Account email: ${email}`,
        "Your account is pending Super Admin approval."
      ],
      loginUrl,
      ctaLabel: "View Account"
    });
  },

  recruiterApprovedEmail({ name, email, loginUrl = getLoginUrl("/recruiter/dashboard") }) {
    return template({
      subject: "TalentX recruiter account approved",
      title: "Recruiter account approved",
      intro: `Hello ${name || "Recruiter"}, your recruiter account has been approved.`,
      lines: [
        email ? `Account email: ${email}` : "",
        "You can now post jobs, create drives, and manage candidates."
      ],
      loginUrl,
      ctaLabel: "Open Recruiter Dashboard"
    });
  },

  interviewerCreatedEmail({ name, email, temporaryPassword, loginUrl = getLoginUrl("/interviewer") }) {
    return template({
      subject: "TalentX interviewer account created",
      title: "Interviewer account created",
      intro: `Hello ${name || "Interviewer"}, your TalentX interviewer account has been created.`,
      lines: [
        `Login email: ${email}`,
        temporaryPassword ? `Temporary password: ${temporaryPassword}` : "",
        "You must reset or change your password on first login."
      ],
      loginUrl,
      ctaLabel: "Open Interviewer Panel"
    });
  },

  welcome(name, role) {
    return template({
      subject: "Welcome to TalentX",
      title: "Welcome to TalentX",
      intro: `Hi ${name || "there"}, your ${role || "TalentX"} account has been created successfully.`,
      lines: [
        role === "recruiter"
          ? "Your account is pending admin approval. You will be notified once approved."
          : "Complete your profile to start browsing and applying for jobs."
      ],
      loginUrl: getLoginUrl(),
      ctaLabel: "Log in to TalentX"
    });
  },

  applicationStatusChange(studentName, jobTitle, companyName, newStatus) {
    const statusMessages = {
      SHORTLISTED: "Congratulations! You have been shortlisted.",
      ASSESSMENT_SENT: "An assessment has been sent to you.",
      ASSESSMENT_PASSED: "You passed the assessment.",
      ASSESSMENT_FAILED: "Unfortunately, you did not pass the assessment.",
      INTERVIEW_SCHEDULED: "Your interview has been scheduled.",
      SELECTED: "Congratulations! You have been selected.",
      REJECTED: "Your application was not selected."
    };
    return template({
      subject: `Application Update: ${jobTitle} at ${companyName}`,
      title: "Application update",
      intro: `Hi ${studentName || "Student"}, ${statusMessages[newStatus] || `your application status is ${newStatus}`}`,
      lines: [`Role: ${jobTitle}`, `Company: ${companyName}`],
      loginUrl: getLoginUrl("/student/applications"),
      ctaLabel: "View Application"
    });
  },

  recruiterApproved(name) {
    return emailTemplates.recruiterApprovedEmail({ name });
  },

  interviewScheduled(studentName, jobTitle, date, mode, link) {
    return template({
      subject: `Interview Scheduled: ${jobTitle}`,
      title: "Interview scheduled",
      intro: `Hi ${studentName || "Student"}, your interview has been scheduled.`,
      lines: [
        `Role: ${jobTitle}`,
        `Date: ${new Date(date).toLocaleString()}`,
        `Mode: ${mode}`,
        link ? `Link: ${link}` : ""
      ],
      loginUrl: getLoginUrl("/student/interviews"),
      ctaLabel: "View Interview"
    });
  },

  interviewSlotsPublished(studentName, jobTitle, slotCount) {
    return template({
      subject: `Interview Slots Available: ${jobTitle}`,
      title: "Choose your interview slot",
      intro: `Hi ${studentName || "Student"}, ${slotCount} interview slot(s) are available.`,
      lines: [`Role: ${jobTitle}`, "Please log in and book your preferred slot."],
      loginUrl: getLoginUrl("/student/interviews"),
      ctaLabel: "Book Slot"
    });
  },

  interviewSlotBooked(recruiterName, jobTitle, candidateName, date, mode) {
    return template({
      subject: `Interview Slot Booked: ${jobTitle}`,
      title: "Interview slot booked",
      intro: `Hi ${recruiterName || "Recruiter"}, ${candidateName || "A candidate"} booked an interview slot.`,
      lines: [`Role: ${jobTitle}`, `Date: ${new Date(date).toLocaleString()}`, `Mode: ${mode}`],
      loginUrl: getLoginUrl("/recruiter/applications"),
      ctaLabel: "View Candidate"
    });
  },

  onboardingDocumentsApproved(studentName, companyName) {
    return template({
      subject: `Onboarding Documents Approved - ${companyName}`,
      title: "Documents approved",
      intro: `Hi ${studentName || "Student"}, your onboarding documents have been approved.`,
      lines: [`Company: ${companyName}`],
      loginUrl: getLoginUrl(),
      ctaLabel: "Open TalentX"
    });
  },

  onboardingDocumentsRejected(studentName, companyName, rejectionReason) {
    return template({
      subject: `Action Required: Onboarding Documents - ${companyName}`,
      title: "Action required",
      intro: `Hi ${studentName || "Student"}, there is an issue with your onboarding documents.`,
      lines: [`Company: ${companyName}`, `Reviewer notes: ${rejectionReason}`],
      loginUrl: getLoginUrl(),
      ctaLabel: "Open TalentX"
    });
  }
};

module.exports = { sendEmail, emailTemplates, readEmailConfig, isEmailConfigured };
