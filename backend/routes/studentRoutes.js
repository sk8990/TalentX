const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

const {
  createOrUpdateProfile,
  getProfile,
  uploadResume
} = require("../controllers/studentController");

const {
  getEligibleJobs
} = require("../controllers/studentJobController");

router.post("/profile", auth, role("student"), createOrUpdateProfile);
router.put("/profile", auth, role("student"), createOrUpdateProfile);
router.get("/profile", auth, role("student"), getProfile);
router.get("/jobs", auth, role("student"), getEligibleJobs);
router.post("/upload-resume", auth, role("student"), uploadResume);

module.exports = router;
