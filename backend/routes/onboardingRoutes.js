const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const onboardingAuth = require("../middleware/onboardingAuth");
const role = require("../middleware/roleMiddleware");
const upload = require("../middleware/onboardingUpload");
const requireFeature = require("../middleware/requireFeature");
const requireApprovedRecruiter = require("../middleware/requireApprovedRecruiter");
const { enforceLimit } = require("../middleware/packageLimits");
const { withUsageIncrement } = require("../middleware/usageTracker");
const requireStudentOnboardingAccess = require("../middleware/requireStudentOnboardingAccess");
const {
  initOnboarding,
  getOnboardingPortal,
  getOnboardingCompanies,
  getOnboardingDetails,
  getLearnMoreSection,
  getPreJoiningReading,
  getPreJoiningVideo,
  submitStep,
  uploadOnboardingDocument,
  verifyOnboardingDocument,
  acceptOffer,
  getStats
} = require("../controllers/onboardingController");

const requireOnboardingManagement = requireFeature("onboardingManagement");
const enforceOnboardingPanelAccess = enforceLimit("onboarding_panel_access");

function requireRecruiterOnboardingManagement(req, res, next) {
  if (req.user?.role === "recruiter") {
    return requireOnboardingManagement(req, res, next);
  }
  return next();
}

function requireRecruiterOnboardingLimit(req, res, next) {
  if (req.user?.role === "recruiter") {
    return enforceOnboardingPanelAccess(req, res, next);
  }
  return next();
}

function trackRecruiterOnboardingUsage(controller) {
  return (req, res, next) => {
    if (req.user?.role === "recruiter") {
      return withUsageIncrement(controller, "onboarding_panel_access")(req, res, next);
    }
    return controller(req, res, next);
  };
}

router.post("/init", auth, role("student"), requireStudentOnboardingAccess, initOnboarding);
router.get(
  "/",
  onboardingAuth,
  requireStudentOnboardingAccess,
  requireApprovedRecruiter,
  requireRecruiterOnboardingManagement,
  requireRecruiterOnboardingLimit,
  trackRecruiterOnboardingUsage(getOnboardingPortal)
);
router.get("/companies", onboardingAuth, role("student"), requireStudentOnboardingAccess, getOnboardingCompanies);
router.get("/stats", auth, role("recruiter"), requireApprovedRecruiter, requireOnboardingManagement, getStats);
router.get("/learn-more/:instanceId/:sectionKey", onboardingAuth, role("student"), requireStudentOnboardingAccess, getLearnMoreSection);
router.get("/pre-joining/:instanceId/content/:taskKey", onboardingAuth, role("student"), requireStudentOnboardingAccess, getPreJoiningReading);
router.get("/pre-joining/:instanceId/video", onboardingAuth, role("student"), requireStudentOnboardingAccess, getPreJoiningVideo);
router.post("/step/:id", onboardingAuth, role("student"), requireStudentOnboardingAccess, submitStep);
router.get("/:companyOrApplicationId", onboardingAuth, role("student"), requireStudentOnboardingAccess, getOnboardingDetails);
router.post("/:companyOrApplicationId/documents", onboardingAuth, role("student"), requireStudentOnboardingAccess, upload.single("file"), uploadOnboardingDocument);
router.post("/:companyOrApplicationId/documents/:documentId/verify", onboardingAuth, role("student"), requireStudentOnboardingAccess, verifyOnboardingDocument);
router.post("/:companyOrApplicationId/accept-offer", onboardingAuth, role("student"), requireStudentOnboardingAccess, acceptOffer);

module.exports = router;
