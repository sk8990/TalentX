const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const onboardingAuth = require("../middleware/onboardingAuth");
const role = require("../middleware/roleMiddleware");
const upload = require("../middleware/onboardingUpload");
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

router.post("/init", auth, role("student"), initOnboarding);
router.get("/", onboardingAuth, getOnboardingPortal);
router.get("/companies", onboardingAuth, role("student"), getOnboardingCompanies);
router.get("/stats", auth, role("recruiter"), getStats);
router.get("/learn-more/:instanceId/:sectionKey", onboardingAuth, role("student"), getLearnMoreSection);
router.get("/pre-joining/:instanceId/content/:taskKey", onboardingAuth, role("student"), getPreJoiningReading);
router.get("/pre-joining/:instanceId/video", onboardingAuth, role("student"), getPreJoiningVideo);
router.post("/step/:id", onboardingAuth, role("student"), submitStep);
router.get("/:companyOrApplicationId", onboardingAuth, role("student"), getOnboardingDetails);
router.post("/:companyOrApplicationId/documents", onboardingAuth, role("student"), upload.single("file"), uploadOnboardingDocument);
router.post("/:companyOrApplicationId/documents/:documentId/verify", onboardingAuth, role("student"), verifyOnboardingDocument);
router.post("/:companyOrApplicationId/accept-offer", onboardingAuth, role("student"), acceptOffer);

module.exports = router;
