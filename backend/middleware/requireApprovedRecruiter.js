const User = require("../models/User");

module.exports = async function requireApprovedRecruiter(req, res, next) {
  try {
    if (req.user?.role !== "recruiter") {
      return next();
    }

    const user = await User.findById(req.user.id).select(
      "role recruiterApprovalStatus"
    );

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const status = user.recruiterApprovalStatus || "pending";

    if (status === "approved") {
      return next();
    }

    if (status === "rejected") {
      return res.status(403).json({
        message:
          "Your recruiter account has been rejected. Please contact TalentX support."
      });
    }

    if (status === "suspended") {
      return res.status(403).json({
        message:
          "Your recruiter account has been suspended. Please contact TalentX support."
      });
    }

    return res.status(403).json({
      message:
        "Your recruiter account is pending approval from TalentX Super Admin."
    });
  } catch (err) {
    console.error("requireApprovedRecruiter error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
