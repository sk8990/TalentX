const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const requireFeature = require("../middleware/requireFeature");
const { requireJobLimit } = require("../middleware/requireJobLimit");
const { getJobsForStudent } = require("../controllers/jobController");
const { postJob } = require("../controllers/companyController");

router.get(
  "/student",
  auth,
  role("student"),
  getJobsForStudent
);

router.post(
  "/",
  auth,
  role("recruiter"),
  requireFeature("jobPosting"),
  requireJobLimit,
  postJob
);

module.exports = router;
