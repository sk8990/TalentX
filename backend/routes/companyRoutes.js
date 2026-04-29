const router = require("express").Router();
const auth = require("../middleware/authMiddleware.js");
const role = require("../middleware/roleMiddleware.js");
const upload = require("../middleware/upload");
const requireFeature = require("../middleware/requireFeature");
const { requireJobLimit } = require("../middleware/requireJobLimit");
const { withUsageIncrement } = require("../middleware/usageTracker");
const { createCompany, getCompanies, postJob, getAllJobs, getRecruiterJobs, updateJob, deleteJob } = require("../controllers/companyController.js");
const { getRecruiterStats } = require("../controllers/companyController");
const { generateJobDescription, parseJobDescription, parseUploadedJobDescription } = require("../controllers/aiController.js");

router.post("/", auth, role("recruiter"), createCompany);
router.get("/list", auth, role("recruiter"), getCompanies);
router.post("/job", auth, role("recruiter"), requireFeature("jobPosting"), requireJobLimit, withUsageIncrement(postJob, "job_creation"));
router.get("/jobs", auth, role("admin"), requireFeature("adminDashboard"), getAllJobs);
router.get("/recruiter/jobs", auth, role("recruiter"), getRecruiterJobs);
router.put(
  "/job/:jobId",
  auth,
  role("recruiter"),
  requireFeature("jobPosting"),
  requireJobLimit,
  updateJob
);

router.delete(
  "/job/:jobId",
  auth,
  role("recruiter"),
  deleteJob
);

router.get(
  "/recruiter/stats",
  auth,
  role("recruiter"),
  getRecruiterStats
);

router.post("/job/generate-description", auth, role("recruiter"), requireFeature("aiJdGeneration"), generateJobDescription);
router.post("/job/parse-jd", auth, role("recruiter"), requireFeature("aiJdGeneration"), parseJobDescription);
router.post("/job/parse-jd-upload", auth, role("recruiter"), requireFeature("aiJdGeneration"), upload.single("jd"), parseUploadedJobDescription);
module.exports = router;
