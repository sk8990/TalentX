const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const { getJobsForStudent } = require("../controllers/jobController");

router.get(
  "/student",
  auth,
  role("student"),
  getJobsForStudent
);

module.exports = router;
