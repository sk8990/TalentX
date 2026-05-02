const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const upload = require("../middleware/upload");

const {
  createOrUpdateProfile,
  getProfile,
  uploadResume,
  parseResumeAndAutofill,
  getAccessSummary
} = require("../controllers/studentController");

const {
  changePassword,
  requestEmailChange
} = require("../controllers/studentSettingsController");

const {
  getEligibleJobs
} = require("../controllers/studentJobController");

const {
  getStudentDashboard,
  getJobRecommendations
} = require("../controllers/dashboardController");

router.post("/profile", auth, role("student"), createOrUpdateProfile);
router.put("/profile", auth, role("student"), createOrUpdateProfile);
router.get("/profile", auth, role("student"), getProfile);
router.get("/access-summary", auth, role("student"), getAccessSummary);
router.get("/jobs", auth, role("student"), getEligibleJobs);
router.post("/upload-resume", auth, role("student"), uploadResume);
router.post("/profile/parse-resume", auth, role("student"), upload.single("resume"), parseResumeAndAutofill);

// Student account settings
router.post("/settings/change-password", auth, role("student"), changePassword);
router.post("/settings/request-email-change", auth, role("student"), requestEmailChange);

// F3: Student Dashboard
router.get("/dashboard", auth, role("student"), getStudentDashboard);

// F5: Job Recommendations
router.get("/recommendations", auth, role("student"), getJobRecommendations);

module.exports = router;
