const User = require("../models/User");

/**
 * Middleware that ensures the logged-in user is a college admin
 * (role === "college_admin") and is linked to a college via collegeId.
 *
 * Must be placed AFTER authMiddleware.
 * Attaches req.collegeAdminUser with full user doc (minus password).
 */
module.exports = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("-password").lean();

    if (!user) {
      return res.status(401).json({ message: "User not found." });
    }

    if (user.role !== "college_admin") {
      return res.status(403).json({ message: "Only College Admin can perform this action." });
    }

    if (!user.collegeId) {
      return res.status(403).json({ message: "College Admin is not linked to any college." });
    }

    req.collegeAdminUser = user;
    next();
  } catch (err) {
    console.error("requireCollegeAdmin error:", err);
    return res.status(500).json({ message: "Authorization check failed." });
  }
};
