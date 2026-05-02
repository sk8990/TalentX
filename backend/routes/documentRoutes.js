const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const onboardingAuth = require("../middleware/onboardingAuth");
const role = require("../middleware/roleMiddleware");
const upload = require("../middleware/onboardingUpload");
const requireFeature = require("../middleware/requireFeature");
const requireApprovedRecruiter = require("../middleware/requireApprovedRecruiter");
const requireStudentOnboardingAccess = require("../middleware/requireStudentOnboardingAccess");
const {
  uploadDocument,
  approveDocuments,
  rejectDocuments
} = require("../controllers/documentController");

router.post("/upload", onboardingAuth, role("student"), requireStudentOnboardingAccess, upload.single("file"), uploadDocument);
router.post("/approve", auth, role("recruiter"), requireApprovedRecruiter, requireFeature("onboardingManagement"), approveDocuments);
router.post("/reject", auth, role("recruiter"), requireApprovedRecruiter, requireFeature("onboardingManagement"), rejectDocuments);

module.exports = router;
