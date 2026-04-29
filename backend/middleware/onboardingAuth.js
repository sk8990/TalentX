const jwt = require("jsonwebtoken");
const User = require("../models/User");

function readBearerToken(headerValue) {
  const raw = String(headerValue || "").trim();
  if (!raw.toLowerCase().startsWith("bearer ")) {
    return "";
  }
  return raw.slice(7).trim();
}

function extractRequestToken(req) {
  return (
    readBearerToken(req.headers.authorization) ||
    String(req.query?.token || "").trim() ||
    String(req.body?.token || "").trim()
  );
}

module.exports = async function onboardingAuth(req, res, next) {
  const token = extractRequestToken(req);

  if (!token) {
    return res.status(401).json({ message: "No onboarding token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (!user.isActive) {
      const reason = String(user.disabledReason || "").trim();
      return res.status(403).json({
        message: reason ? `Account disabled: ${reason}` : "Account disabled by admin"
      });
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
      mustChangePassword: Boolean(user.mustChangePassword)
    };
    req.onboardingAuth = {
      token,
      tokenPurpose: decoded.purpose || "platform"
    };

    next();
  } catch (_err) {
    return res.status(401).json({ message: "Invalid or expired onboarding token" });
  }
};
