const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const requireFeature = require("../middleware/requireFeature");
const User = require("../models/User");

const { enforceFeature, enforceLimit } = require("../middleware/packageLimits");
const { withUsageIncrement } = require("../middleware/usageTracker");

const {
  getAllUsers,
  toggleUserStatus,
  getAllJobs,
  deleteJob,
  getPlatformStats,
  getSelectedCandidates,
  getAuditLogs
} = require("../controllers/adminController");

const requireAdminDashboard = requireFeature("adminDashboard");
const requireReportsAnalytics = requireFeature("reportsAnalytics");

// Middleware: university_admin must not toggle privileged accounts.
// Placed BEFORE requireFeature so it fires regardless of subscription state.
// This prevents the feature gate from masking the authorization error.
async function guardPrivilegedToggle(req, res, next) {
  if (req.user.role !== "university_admin") return next();
  try {
    const target = await User.findById(req.params.id).select("role").lean();
    if (!target) return next(); // let the controller return 404
    const PRIVILEGED = ["super_admin", "admin", "university_admin", "college_admin"];
    if (PRIVILEGED.includes(target.role)) {
      return res.status(403).json({
        message: "University Admin cannot manage privileged accounts. Contact Super Admin."
      });
    }
    return next();
  } catch (err) {
    console.error("guardPrivilegedToggle error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

router.get("/users", auth, role("admin"), requireAdminDashboard, getAllUsers);
router.put("/users/:id/toggle", auth, role("admin"), guardPrivilegedToggle, requireAdminDashboard, toggleUserStatus);

router.get("/jobs", auth, role("admin"), requireAdminDashboard, getAllJobs);
router.delete(
  "/jobs/:id",
  auth,
  role("admin"),
  (req, res, next) => {
    if (req.user.role === "university_admin") {
      return res.status(403).json({
        message: "University Admin cannot delete platform jobs in this demo. Contact Super Admin."
      });
    }
    return next();
  },
  requireAdminDashboard,
  enforceFeature("deleteJobFeature"),
  deleteJob
);

router.get("/stats", auth, role("admin"), requireReportsAnalytics, getPlatformStats);
router.get("/selected-candidates", auth, role("admin"), requireReportsAnalytics, getSelectedCandidates);
router.get("/audit-logs", auth, role("admin"), requireReportsAnalytics, enforceLimit("audit_usage"), withUsageIncrement(getAuditLogs, "audit_usage"));
module.exports = router;
