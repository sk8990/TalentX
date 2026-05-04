const User = require('../models/User.js');
const mongoose = require("mongoose");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require("crypto");
const Student = require("../models/Student");
const College = require("../models/College");
const { sendEmail, emailTemplates } = require("../services/emailService");
const { validatePassword } = require("../utils/validatePassword");

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}


exports.register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      studentType,
      collegeId,
      companyName,
      companyEmail,
      companyWebsite
    } = req.body;
    const normalizedName = String(name || "").trim();
    const normalizedRole = String(role || "").trim();
    const normalizedEmail = String(
      normalizedRole === "recruiter" ? (companyEmail || email || "") : (email || "")
    ).trim().toLowerCase();
    const normalizedCompanyName = String(companyName || "").trim();
    const normalizedCompanyWebsite = String(companyWebsite || "").trim();

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

    const emailDomain = normalizedEmail.split("@")[1]?.toLowerCase();

    if (normalizedRole === "recruiter") {
      if (!normalizedCompanyName) {
        return res.status(400).json({ message: "Company name is required" });
      }

      if (!normalizedCompanyWebsite) {
        return res.status(400).json({ message: "Company website is required" });
      }
    }

    const resolvedStudentType =
      normalizedRole === "student"
        ? (studentType === "college_student" ? "college_student" : "open_student")
        : undefined;

    let studentData = {};

    if (normalizedRole === "student" && resolvedStudentType === "college_student") {
      if (!collegeId) {
        return res.status(400).json({ message: "Please select your college." });
      }

      if (!mongoose.Types.ObjectId.isValid(String(collegeId))) {
        return res.status(400).json({ message: "Selected college was not found." });
      }

      const college = await College.findById(collegeId);
      if (!college) {
        return res.status(400).json({ message: "Selected college was not found." });
      }

      if (college.status !== "active" || !college.enterprisePlanActive) {
        return res.status(400).json({ message: "This college is not active on TalentX Enterprise." });
      }

      if (emailDomain !== String(college.domain || "").toLowerCase()) {
        return res.status(400).json({
          message: `Please use your official college email address ending with @${college.domain}.`
        });
      }

      studentData = {
        studentType: "college_student",
        collegeId: college._id,
        collegeName: college.name,
        collegeVerificationStatus: "pending",
        isCollegeVerified: false,
        accessLevel: "limited"
      };
    }

    if (normalizedRole === "student" && resolvedStudentType === "open_student") {
      const domainCollege = await College.findOne({ domain: emailDomain });
      if (domainCollege) {
        return res.status(400).json({
          message: "This email belongs to a registered college. Please register as a College Student and select your college."
        });
      }

      studentData = {
        studentType: "open_student",
        collegeId: null,
        collegeName: null,
        collegeVerificationStatus: "not_required",
        isCollegeVerified: false,
        accessLevel: "limited"
      };
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const userData = {
      name: normalizedName,
      email: normalizedEmail,
      password: hashedPassword,
      role: normalizedRole
    };

    if (normalizedRole === "recruiter") {
      userData.recruiterApprovalStatus = "pending";
      userData.companyName = normalizedCompanyName;
      userData.companyEmail = normalizedEmail;
      userData.companyWebsite = normalizedCompanyWebsite;
    }

    if (normalizedRole === "student" && resolvedStudentType === "college_student") {
      userData.collegeId = studentData.collegeId;
    }

    const user = await User.create(userData);

    if (normalizedRole === "student") {
      await Student.create({
        userId: user._id,
        ...studentData
      });
    }

    if (normalizedRole === "student" && resolvedStudentType === "open_student") {
      sendEmail({
        to: user.email,
        ...emailTemplates.openStudentWelcomeEmail({
          name: user.name,
          email: user.email
        })
      }).catch((error) => {
        console.error("[EMAIL] Send failed:", error.message);
      });
    } else if (normalizedRole === "student" && resolvedStudentType === "college_student") {
      sendEmail({
        to: user.email,
        ...emailTemplates.collegeStudentPendingEmail({
          name: user.name,
          email: user.email,
          collegeName: studentData.collegeName
        })
      }).catch((error) => {
        console.error("[EMAIL] Send failed:", error.message);
      });
    } else if (normalizedRole === "recruiter") {
      sendEmail({
        to: user.email,
        ...emailTemplates.recruiterPendingEmail({
          name: user.name,
          email: user.email
        })
      }).catch((error) => {
        console.error("[EMAIL] Send failed:", error.message);
      });
    }

    const successMessage =
      normalizedRole === "recruiter"
        ? "Your recruiter account is pending approval from TalentX Super Admin."
        : resolvedStudentType === "college_student"
        ? "Signup successful. Your account is pending verification from your College Admin."
        : normalizedRole === "student"
          ? "Signup successful. You are registered as an Open Student."
          : "Registration successful";

    res.status(201).json({
      message: successMessage
    });

  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ message: "Registration failed" });
  }
};


exports.login = async (req, res) => {
    try {
        const {email, password } = req.body;
        const normalizedEmail = String(email || "").trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail });
        if(!user)
            return res.status(401).json({message: 'Invalid credentials'});
        if (!user.isActive) {
            const reason = String(user.disabledReason || "").trim();
            return res.status(403).json({
              message: reason ? `Account disabled: ${reason}` : "Account disabled by admin"
            });
        }
        // Check if student account is disabled by college admin
        if (user.role === "student") {
          const student = await Student.findOne({ userId: user._id }).select("isDisabled").lean();
          if (student && student.isDisabled) {
            return res.status(403).json({
              message: "Your account has been disabled by your college admin. Please contact your college for more information."
            });
          }
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if(!isMatch)
            return res.status(401).json({message: 'Invalid Credentials'});
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

        if (user.role === "recruiter") {
          const approvalStatus = user.recruiterApprovalStatus || "pending";
          responsePayload.user.recruiterApprovalStatus = approvalStatus;
          responsePayload.user.isRecruiterApproved = approvalStatus === "approved";
          responsePayload.user.companyName = user.companyName || "";
          responsePayload.user.companyEmail = user.companyEmail || user.email || "";
          responsePayload.user.companyWebsite = user.companyWebsite || "";
        }

        if (user.mustChangePassword) {
          responsePayload.forcePasswordReset = true;
        }

        res.json(responsePayload);

    } catch (err) {
        res.status(500).json({message: "Login failed"});
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

      const frontendUrl = String(process.env.FRONTEND_URL || "http://localhost:3000").trim().replace(/\/+$/, "");
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

      sendEmail({
        to: user.email,
        subject: "TalentX Password Reset",
        html
      }).catch((error) => {
        console.error("[EMAIL] Send failed:", error.message);
      });
    }

    res.json({
      message: "If this email is registered, reset instructions have been sent."
    });
  } catch (err) {
    console.error("forgotPassword error:", err);
    res.status(500).json({ message: "Password reset failed" });
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
    console.error("resetPassword error:", err);
    res.status(500).json({ message: "Password reset failed" });
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
    res.status(500).json({ message: "Password reset failed" });
  }
};

/* ===========================
   CHANGE EMAIL
=========================== */
exports.changeEmail = async (req, res) => {
  try {
    const { newEmail, password } = req.body;

    if (!newEmail || !password) {
      return res.status(400).json({ message: "New email and password are required" });
    }

    const normalizedEmail = String(newEmail).trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Password is incorrect" });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser && String(existingUser._id) !== String(user._id)) {
      return res.status(409).json({ message: "Email already in use" });
    }

    user.email = normalizedEmail;
    await user.save();

    res.json({ message: "Email updated successfully" });
  } catch (err) {
    console.error("CHANGE EMAIL ERROR:", err);
    res.status(500).json({ message: "Email update failed" });
  }
};

/* ===========================
   CHANGE PASSWORD
=========================== */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
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
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("CHANGE PASSWORD ERROR:", err);
    res.status(500).json({ message: "Password update failed" });
  }
};
