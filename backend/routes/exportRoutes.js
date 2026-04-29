const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const requireFeature = require("../middleware/requireFeature");
const {
  exportPlacements,
  exportUsers,
  exportJobs,
} = require("../controllers/exportController");

router.get("/placements", auth, role("admin"), requireFeature("reportsAnalytics"), exportPlacements);
router.get("/users", auth, role("admin"), requireFeature("reportsAnalytics"), exportUsers);
router.get("/jobs", auth, role("admin"), requireFeature("reportsAnalytics"), exportJobs);

module.exports = router;
