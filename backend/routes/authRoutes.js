const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const {
  register,
  login,
  forgotPassword,
  resetPassword,
  interviewerResetPassword,
  changeEmail,
  changePassword
} = require("../controllers/authController");

router.post("/register", register);
router.post("/signup/student", (req, res) => {
  req.body = { ...req.body, role: "student" };
  return register(req, res);
});
router.post("/signup/recruiter", (req, res) => {
  req.body = { ...req.body, role: "recruiter" };
  return register(req, res);
});
router.post("/login", login);

// Lightweight token verification – the frontend calls this on page load to
// confirm a stored token is still valid on the server side.
router.get("/verify", auth, (req, res) => {
  res.json({ valid: true, role: req.user.role });
});

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/interviewer/reset-password", auth, role("interviewer"), interviewerResetPassword);
router.post("/change-email", auth, changeEmail);
router.post("/change-password", auth, changePassword);

// ── Dev-only test email route ────────────────────────────────────────────────
if (process.env.NODE_ENV !== "production") {
  const { sendEmail } = require("../services/emailService");

  router.get("/test-email", async (req, res) => {
    const to = String(req.query.to || "test@example.com").trim();
    const result = await sendEmail({
      to,
      subject: "TalentX Test Email",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <div style="border-radius: 14px; background: #243b95; padding: 24px; color: #ffffff;">
            <h1 style="margin: 0; font-size: 24px;">Test Email</h1>
            <p style="margin: 8px 0 0; color: #dbeafe;">TalentX Email Service</p>
          </div>
          <div style="padding: 24px 0;">
            <p style="color: #334155;">This is a test email from TalentX.</p>
            <p style="color: #334155;">If you see this, your email driver is working correctly.</p>
            <p style="color: #64748b; font-size: 13px;">Sent at: ${new Date().toISOString()}</p>
          </div>
        </div>
      `,
      text: `TalentX Test Email\n\nThis is a test email. Sent at: ${new Date().toISOString()}`
    });
    res.json({ driver: process.env.EMAIL_DRIVER || "none", ...result });
  });
}

module.exports = router;
