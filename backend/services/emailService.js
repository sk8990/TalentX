if (process.env.NO_COLOR) {
  delete process.env.NO_COLOR;
}
if (!process.env.FORCE_COLOR) {
  process.env.FORCE_COLOR = "3";
}

const nodemailer = require("nodemailer");

// Creates a transporter — uses Ethereal for dev, real SMTP for production

const chalkLib = require("chalk");
const chalk = chalkLib?.Instance ? new chalkLib.Instance({ level: 3 }) : chalkLib;

function logEmailSeparator() {
  console.log(chalk.gray("------------------------------------------------------------"));
}

let transporter;

async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST) {
    // Production: use real SMTP
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Development: use Ethereal test account
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    logEmailSeparator();
    console.log(chalk.cyan(`[EMAIL] Using Ethereal test account: ${testAccount.user}`));
    logEmailSeparator();
  }

  return transporter;
}

async function sendEmail({ to, subject, html }) {
  try {
    const t = await getTransporter();
    const from = process.env.SMTP_FROM || "TalentX <noreply@talentx.com>";

    const info = await t.sendMail({ from, to, subject, html });
    const messageId = String(info?.messageId || "N/A");
    logEmailSeparator();
    console.log(chalk.green.bold("Email sent successfully!"));
    console.log(chalk.cyan(`Message ID: ${messageId}`));

    // In dev, log the preview URL
    if (!process.env.SMTP_HOST) {
      const previewUrl = nodemailer.getTestMessageUrl(info) || "N/A";
      console.log(chalk.yellowBright.bold(`Preview URL: ${previewUrl}`));
    }
    logEmailSeparator();

    return info;
  } catch (err) {
    logEmailSeparator();
    console.error(chalk.red("Email send failed"));
    console.error(chalk.red(err?.stack || err?.message || String(err)));
    logEmailSeparator();
    return null;
  }
}

// Pre-built email templates
const emailTemplates = {
  welcome(name, role) {
    return {
      subject: "Welcome to TalentX!",
      html: `
        <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
          <div style="background: linear-gradient(135deg, #4f46e5, #0891b2); border-radius: 16px; padding: 32px; color: white; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">Welcome to TalentX! 🚀</h1>
          </div>
          <div style="padding: 24px 0;">
            <p>Hi <strong>${name}</strong>,</p>
            <p>Your ${role} account has been created successfully.</p>
            ${role === "recruiter" ? "<p>Your account is pending admin approval. You'll be notified once approved.</p>" : "<p>Complete your profile to start browsing and applying for jobs!</p>"}
          </div>
          <div style="text-align: center; padding: 16px; color: #94a3b8; font-size: 12px;">
            TalentX — Your Career, Accelerated.
          </div>
        </div>
      `,
    };
  },

  applicationStatusChange(studentName, jobTitle, companyName, newStatus) {
    const statusMessages = {
      SHORTLISTED: "Congratulations! You've been shortlisted.",
      ASSESSMENT_SENT: "An assessment has been sent to you.",
      ASSESSMENT_PASSED: "You passed the assessment! 🎉",
      ASSESSMENT_FAILED: "Unfortunately, you didn't pass the assessment.",
      INTERVIEW_SCHEDULED: "Your interview has been scheduled!",
      SELECTED: "Congratulations! You've been selected! 🎉🎉",
      REJECTED: "We're sorry, your application was not selected.",
    };

    return {
      subject: `Application Update: ${jobTitle} at ${companyName}`,
      html: `
        <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
          <div style="background: linear-gradient(135deg, #4f46e5, #0891b2); border-radius: 16px; padding: 32px; color: white;">
            <h1 style="margin: 0;">Application Update</h1>
            <p style="margin: 8px 0 0;">${jobTitle} at ${companyName}</p>
          </div>
          <div style="padding: 24px 0;">
            <p>Hi <strong>${studentName}</strong>,</p>
            <p>${statusMessages[newStatus] || `Your application status has been updated to: ${newStatus}`}</p>
            <p>Log in to TalentX to view the details.</p>
          </div>
        </div>
      `,
    };
  },

  recruiterApproved(name) {
    return {
      subject: "Your TalentX Account Has Been Approved!",
      html: `
        <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
          <div style="background: linear-gradient(135deg, #059669, #0891b2); border-radius: 16px; padding: 32px; color: white; text-align: center;">
            <h1 style="margin: 0;">Account Approved! ✅</h1>
          </div>
          <div style="padding: 24px 0;">
            <p>Hi <strong>${name}</strong>,</p>
            <p>Your recruiter account has been approved. You can now log in and start posting jobs!</p>
          </div>
        </div>
      `,
    };
  },

  interviewScheduled(studentName, jobTitle, date, mode, link) {
    return {
      subject: `Interview Scheduled: ${jobTitle}`,
      html: `
        <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
          <div style="background: linear-gradient(135deg, #7c3aed, #4f46e5); border-radius: 16px; padding: 32px; color: white;">
            <h1 style="margin: 0;">Interview Scheduled 📅</h1>
          </div>
          <div style="padding: 24px 0;">
            <p>Hi <strong>${studentName}</strong>,</p>
            <p>Your interview for <strong>${jobTitle}</strong> has been scheduled:</p>
            <ul>
              <li><strong>Date:</strong> ${new Date(date).toLocaleString()}</li>
              <li><strong>Mode:</strong> ${mode}</li>
              ${link ? `<li><strong>Link:</strong> <a href="${link}">${link}</a></li>` : ""}
            </ul>
          </div>
        </div>
      `,
    };
  },

  interviewSlotsPublished(studentName, jobTitle, slotCount) {
    return {
      subject: `Interview Slots Available: ${jobTitle}`,
      html: `
        <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
          <div style="background: linear-gradient(135deg, #0f766e, #0284c7); border-radius: 16px; padding: 32px; color: white;">
            <h1 style="margin: 0;">Choose Your Interview Slot</h1>
          </div>
          <div style="padding: 24px 0;">
            <p>Hi <strong>${studentName}</strong>,</p>
            <p>${slotCount} interview slot(s) are now available for <strong>${jobTitle}</strong>.</p>
            <p>Please log in to TalentX and book your preferred time slot.</p>
          </div>
        </div>
      `,
    };
  },

  interviewSlotBooked(recruiterName, jobTitle, candidateName, date, mode) {
    return {
      subject: `Interview Slot Booked: ${jobTitle}`,
      html: `
        <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
          <div style="background: linear-gradient(135deg, #1d4ed8, #0f766e); border-radius: 16px; padding: 32px; color: white;">
            <h1 style="margin: 0;">Interview Slot Confirmed</h1>
          </div>
          <div style="padding: 24px 0;">
            <p>Hi <strong>${recruiterName}</strong>,</p>
            <p><strong>${candidateName}</strong> booked an interview slot for <strong>${jobTitle}</strong>.</p>
            <ul>
              <li><strong>Date:</strong> ${new Date(date).toLocaleString()}</li>
              <li><strong>Mode:</strong> ${mode}</li>
            </ul>
          </div>
        </div>
      `,
    };
  },
};

module.exports = { sendEmail, emailTemplates };
