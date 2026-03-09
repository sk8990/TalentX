const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

const {
  getAllUsers,
  toggleUserStatus,
  getAllJobs,
  deleteJob,
  getPlatformStats,
  getPendingRecruiters,
  reviewRecruiter,
  getSelectedCandidates
} = require("../controllers/adminController");

router.get("/users", auth, role("admin"), getAllUsers);
router.put("/users/:id/toggle", auth, role("admin"), toggleUserStatus);

router.get("/jobs", auth, role("admin"), getAllJobs);
router.delete("/jobs/:id", auth, role("admin"), deleteJob);

router.get("/stats", auth, role("admin"), getPlatformStats);
router.get("/selected-candidates", auth, role("admin"), getSelectedCandidates);
router.get("/pending-recruiters", auth, role("admin"), getPendingRecruiters);

router.put(
  "/recruiter-review/:id",
  auth,
  role("admin"),
  reviewRecruiter
);

module.exports = router;
