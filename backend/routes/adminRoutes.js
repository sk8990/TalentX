const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const requireFeature = require("../middleware/requireFeature");

const { enforceFeature, enforceLimit } = require("../middleware/packageLimits");
const { withUsageIncrement } = require("../middleware/usageTracker");

const {
  getAllUsers,
  toggleUserStatus,
  getAllJobs,
  deleteJob,
  getPlatformStats,
  getPendingRecruiters,
  reviewRecruiter,
  getSelectedCandidates,
  getAuditLogs
} = require("../controllers/adminController");

const requireAdminDashboard = requireFeature("adminDashboard");
const requireReportsAnalytics = requireFeature("reportsAnalytics");

router.get("/users", auth, role("admin"), requireAdminDashboard, getAllUsers);
router.put("/users/:id/toggle", auth, role("admin"), requireAdminDashboard, toggleUserStatus);

router.get("/jobs", auth, role("admin"), requireAdminDashboard, getAllJobs);
router.delete("/jobs/:id", auth, role("admin"), requireAdminDashboard, enforceFeature("deleteJobFeature"), deleteJob);

router.get("/stats", auth, role("admin"), requireReportsAnalytics, getPlatformStats);
router.get("/selected-candidates", auth, role("admin"), requireReportsAnalytics, getSelectedCandidates);
router.get("/audit-logs", auth, role("admin"), requireReportsAnalytics, enforceLimit("audit_usage"), withUsageIncrement(getAuditLogs, "audit_usage"));
router.get("/audit/logs", auth, role("admin"), requireReportsAnalytics, enforceLimit("audit_usage"), withUsageIncrement(getAuditLogs, "audit_usage"));
router.get("/audit_logs", auth, role("admin"), requireReportsAnalytics, enforceLimit("audit_usage"), withUsageIncrement(getAuditLogs, "audit_usage"));
router.get("/pending-recruiters", auth, role("admin"), requireAdminDashboard, getPendingRecruiters);

router.put(
  "/recruiter-review/:id",
  auth,
  role("admin"),
  requireAdminDashboard,
  reviewRecruiter
);

module.exports = router;
