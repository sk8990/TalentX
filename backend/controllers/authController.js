const User = require('../models/User.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require("crypto");
const Student = require("../models/Student");
const { sendEmail } = require("../services/emailService");

const zxcvbn = require("zxcvbn");

function validatePassword(password) {
  const minLength = 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (!password) return "Password is required";

  if (password.length < minLength)
    return "Password must be at least 8 characters long";

  if (!hasUpper)
    return "Password must contain at least one uppercase letter";

  if (!hasLower)
    return "Password must contain at least one lowercase letter";

  if (!hasNumber)
    return "Password must contain at least one number";

  if (!hasSymbol)
    return "Password must contain at least one special character";

  const strength = zxcvbn(password);
  if (strength.score < 3)
    return "Password is too weak";

  return null;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const normalizedName = String(name || "").trim();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedRole = String(role || "").trim();

    if (!normalizedName || !normalizedEmail || !password || !normalizedRole) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    const allowedRoles = ["student", "recruiter"];
    if (!allowedRoles.includes(normalizedRole)) {
      return res.status(400).json({ message: "Invalid role selected. Interviewer accounts are created by recruiters." });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password: hashedPassword,
      role: normalizedRole
    });

    if (normalizedRole === "student") {
      await Student.create({ userId: user._id });
    }

    res.status(201).json({ message: "Registration successful" });

  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};


exports.login = async (req, res) => {
    try {
        const {email, password } = req.body;
        const normalizedEmail = String(email || "").trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail });
        if(!user)
            return res.status(401).json({message: 'Invalid credentials'});
        if (!user.isActive)
            return res.status(403).json({message: "Account disabled by admin"});
        const isMatch = await bcrypt.compare(password, user.password);
        if(!isMatch)
            return res.status(401).json({message: 'Invalid Credentials'});
        if (user.role === "recruiter" && !user.isApproved) {
          return res.status(403).json ({
            message: "Your account is pending approval. Please wait for an admin to approve your account."
          });
        }
        const token = jwt.sign(
            {id: user._id, role: user.role},
            process.env.JWT_SECRET,
            {expiresIn: '1d'}
        );

        const responsePayload = {
  token,
  user: {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role
  }
};

        if (user.mustChangePassword) {
          responsePayload.forcePasswordReset = true;
        }

        res.json(responsePayload);

    } catch (err) {
        res.status(500).json({error: err.message});
    }
};

/* ===========================
   FORGOT PASSWORD
=========================== */
exports.forgotPassword = async (req, res) => {
  try {
    const normalizedEmail = String(req.body?.email || "").trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      return res.status(200).json({
        message: "If this email is registered, reset instructions have been sent."
      });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (user) {
      const resetToken = crypto.randomBytes(20).toString("hex");

      user.resetPasswordToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

      user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 min
      await user.save();

      const frontendUrl = String(process.env.FRONTEND_URL || "http://localhost:5173").trim().replace(/\/+$/, "");
      const resetPage = `${frontendUrl}/forgot-password`;
      const html = `
        <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2>Password Reset Request</h2>
          <p>We received a request to reset your TalentX account password.</p>
          <p>Use this reset token (valid for 15 minutes):</p>
          <p style="font-size: 18px; font-weight: 700; letter-spacing: 0.04em;">${resetToken}</p>
          <p>Open <a href="${resetPage}">${resetPage}</a> and submit this token with your new password.</p>
          <p>If you did not request this, you can ignore this email.</p>
        </div>
      `;

      await sendEmail({
        to: user.email,
        subject: "TalentX Password Reset",
        html
      });
    }

    res.json({
      message: "If this email is registered, reset instructions have been sent."
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ===========================
   RESET PASSWORD
=========================== */
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ===========================
   INTERVIEWER FIRST-LOGIN PASSWORD RESET
=========================== */
exports.interviewerResetPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.mustChangePassword) {
      return res.status(400).json({ message: "Password reset is not required" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.mustChangePassword = false;
    await user.save();

    res.json({ message: "Password reset successful. You can now access your panel." });
  } catch (err) {
    console.error("INTERVIEWER RESET ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};
