const User = require('../models/User.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require("crypto");
const Student = require("../models/Student");

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
        const user = await User.findOne({email});
        if(!user)
            return res.status(401).json({message: 'Invalid credentials'});
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

        res.json({
  token,
  user: {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role
  }
});

    } catch (err) {
        res.status(500).json({error: err.message});
    }
};

/* ===========================
   FORGOT PASSWORD
=========================== */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate token
    const resetToken = crypto.randomBytes(20).toString("hex");

    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 min

    await user.save();

    // In real app → email this link
    res.json({
      message: "Password reset token generated",
      resetToken
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

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
