const { checkStudentLimit } = require("../helpers/studentAccessHelper");

module.exports = async function requireStudentOnboardingAccess(req, res, next) {
  try {
    if (req.user?.role !== "student") {
      return next();
    }

    const limitCheck = await checkStudentLimit(req.user, "onboarding");
    if (!limitCheck.allowed) {
      return res.status(403).json({
        message: "Onboarding access is available only for verified Enterprise college students."
      });
    }

    return next();
  } catch (err) {
    console.error("requireStudentOnboardingAccess error:", err);
    return res.status(500).json({ message: "Unable to validate onboarding access" });
  }
};
