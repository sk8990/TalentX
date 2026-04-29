const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const requireSuperAdmin = require("../middleware/requireSuperAdmin");
const {
  getDashboard,
  getPackages,
  getPayments,
  getRevenue,
  getSubscriptions,
  createPackage,
  updatePackage,
  togglePackageStatus,
  getEnterpriseRequests,
  handleEnterpriseRequest,
  assignPackageToUser,
  getUniversities,
  disableUniversity,
  enableUniversity,
  getRecruiters,
  disableRecruiter,
  enableRecruiter
} = require("../controllers/superAdminController");

router.use(auth, requireSuperAdmin);

router.get("/dashboard", getDashboard);
router.get("/packages", getPackages);
router.post("/packages", createPackage);
router.put("/packages/:id", updatePackage);
router.patch("/packages/:id/:field/status", togglePackageStatus);
router.get("/payments", getPayments);
router.get("/revenue", getRevenue);
router.get("/subscriptions", getSubscriptions);
router.get("/enterprise-requests", getEnterpriseRequests);
router.patch("/enterprise-requests/:id/handle", handleEnterpriseRequest);
router.post("/users/:userId/assign-package", assignPackageToUser);
router.get("/universities", getUniversities);
router.patch("/universities/:id/disable", disableUniversity);
router.patch("/universities/:id/enable", enableUniversity);
router.get("/recruiters", getRecruiters);
router.patch("/recruiters/:id/disable", disableRecruiter);
router.patch("/recruiters/:id/enable", enableRecruiter);

module.exports = router;
