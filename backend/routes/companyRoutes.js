const router = require("express").Router();
const mongoose = require("mongoose");
const auth = require("../middleware/authMiddleware.js");
const role = require("../middleware/roleMiddleware.js");
const upload = require("../middleware/upload");
const requireFeature = require("../middleware/requireFeature");
const { requireJobLimit } = require("../middleware/requireJobLimit");
const { withUsageIncrement } = require("../middleware/usageTracker");
const { createCompany, getCompanies, postJob, getAllJobs, getRecruiterJobs, updateJob, deleteJob } = require("../controllers/companyController.js");
const { getRecruiterStats } = require("../controllers/companyController");
const { generateJobDescription, parseJobDescription, parseUploadedJobDescription } = require("../controllers/aiController.js");
const requireApprovedRecruiter = require("../middleware/requireApprovedRecruiter");

router.param("jobId", (req, res, next, value) => {
  if (!mongoose.Types.ObjectId.isValid(String(value))) {
    return res.status(400).json({ message: "Invalid job id" });
  }

  return next();
});

router.post("/", auth, role("recruiter"), createCompany);
router.get("/list", auth, role("recruiter"), getCompanies);
router.post("/job", auth, role("recruiter"), requireApprovedRecruiter, requireFeature("jobPosting"), requireJobLimit, withUsageIncrement(postJob, "job_creation"));
router.get("/jobs", auth, role("admin"), requireFeature("adminDashboard"), getAllJobs);
router.get("/recruiter/jobs", auth, role("recruiter"), requireApprovedRecruiter, getRecruiterJobs);
router.put(
  "/job/:jobId",
  auth,
  role("recruiter"),
  requireApprovedRecruiter,
  requireFeature("jobPosting"),
  requireJobLimit,
  updateJob
);

router.delete(
  "/job/:jobId",
  auth,
  role("recruiter"),
  requireApprovedRecruiter,
  deleteJob
);

router.get(
  "/recruiter/stats",
  auth,
  role("recruiter"),
  requireApprovedRecruiter,
  getRecruiterStats
);

router.post("/job/generate-description", auth, role("recruiter"), requireApprovedRecruiter, requireFeature("aiJdGeneration"), generateJobDescription);
router.post("/job/parse-jd", auth, role("recruiter"), requireApprovedRecruiter, requireFeature("aiJdGeneration"), parseJobDescription);
router.post("/job/parse-jd-upload", auth, role("recruiter"), requireApprovedRecruiter, requireFeature("aiJdGeneration"), upload.single("jd"), parseUploadedJobDescription);
module.exports = router;
