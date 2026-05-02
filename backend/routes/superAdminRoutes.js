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

const {
  createCollege,
  getColleges,
  getCollegeById,
  updateCollege,
  deleteCollege
} = require("../controllers/collegeController");

const {
  createCollegeAdmin,
  getCollegeAdmins,
  getCollegeAdminById
} = require("../controllers/collegeAdminController");

const {
  getPendingRecruiters,
  getApprovedRecruiters,
  getRejectedRecruiters,
  getSuspendedRecruiters,
  approveRecruiter,
  rejectRecruiter,
  suspendRecruiter
} = require("../controllers/recruiterApprovalController");

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

router.get("/recruiters/pending", getPendingRecruiters);
router.get("/recruiters/approved", getApprovedRecruiters);
router.get("/recruiters/rejected", getRejectedRecruiters);
router.get("/recruiters/suspended", getSuspendedRecruiters);
router.get("/recruiters", getRecruiters);
router.patch("/recruiters/:id/disable", disableRecruiter);
router.patch("/recruiters/:id/enable", enableRecruiter);
router.post("/recruiters/:id/approve", approveRecruiter);
router.post("/recruiters/:id/reject", rejectRecruiter);
router.post("/recruiters/:id/suspend", suspendRecruiter);

router.post("/colleges", createCollege);
router.get("/colleges", getColleges);
router.get("/colleges/:id", getCollegeById);
router.put("/colleges/:id", updateCollege);
router.delete("/colleges/:id", deleteCollege);

router.post("/college-admins", createCollegeAdmin);
router.get("/college-admins", getCollegeAdmins);
router.get("/college-admins/:id", getCollegeAdminById);

module.exports = router;
