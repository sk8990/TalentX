"use strict";

const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { validatePassword } = require("../utils/validatePassword");

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

exports.changePassword = async (req, res) => {
  try {
    const currentPassword = String(req.body?.currentPassword || "");
    const newPassword = String(req.body?.newPassword || "");

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current password and new password are required"
      });
    }

    const user = await User.findById(req.user.id).select("password role");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    const isSame = await bcrypt.compare(newPassword, user.password);
    if (isSame) {
      return res.status(400).json({
        message: "New password must be different from your current password"
      });
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    return res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("changePassword error:", err);
    return res.status(500).json({ message: "Unable to change password" });
  }
};

exports.requestEmailChange = async (req, res) => {
  try {
    const newEmail = String(req.body?.newEmail || "").trim().toLowerCase();

    if (!newEmail) {
      return res.status(400).json({ message: "New email address is required" });
    }

    if (!isValidEmail(newEmail)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    const user = await User.findById(req.user.id).select("email pendingEmail role");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (newEmail === user.email) {
      return res.status(400).json({
        message: "This is already your current email address"
      });
    }

    const conflict = await User.findOne({ email: newEmail }).select("_id");
    if (conflict) {
      return res.status(409).json({
        message: "This email address is already registered to another account"
      });
    }

    if (user.pendingEmail) {
      user.pendingEmail = null;
      await user.save();
    }

    return res.status(501).json({
      message: "Email change feature coming soon. Your current email has not been changed.",
      pendingEmail: null
    });
  } catch (err) {
    console.error("requestEmailChange error:", err);
    return res.status(500).json({ message: "Unable to process email change request" });
  }
};
