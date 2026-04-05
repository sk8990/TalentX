const router = require("express").Router();
const auth = require("../middleware/authMiddleware.js");
const role = require("../middleware/roleMiddleware.js");
const upload = require("../middleware/upload");
const { createCompany, getCompanies, postJob, getAllJobs, getRecruiterJobs, updateJob, deleteJob } = require("../controllers/companyController.js");
const { getRecruiterStats } = require("../controllers/companyController");
const { generateJobDescription, parseJobDescription, parseUploadedJobDescription } = require("../controllers/aiController.js");

router.post("/", auth, role("recruiter"), createCompany);
router.get("/list", auth, role("recruiter"), getCompanies);
router.post("/job", auth, role("recruiter"), postJob);
router.get("/jobs", auth, role("admin"), getAllJobs);
router.get("/recruiter/jobs", auth, role("recruiter"), getRecruiterJobs);
router.put(
  "/job/:jobId",
  auth,
  role("recruiter"),
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

router.post("/job/generate-description", auth, role("recruiter"), generateJobDescription);
router.post("/job/parse-jd", auth, role("recruiter"), parseJobDescription);
router.post("/job/parse-jd-upload", auth, role("recruiter"), upload.single("jd"), parseUploadedJobDescription);
module.exports = router;
