const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const {
  exportPlacements,
  exportUsers,
  exportJobs,
} = require("../controllers/exportController");

router.get("/placements", auth, role("admin"), exportPlacements);
router.get("/users", auth, role("admin"), exportUsers);
router.get("/jobs", auth, role("admin"), exportJobs);

module.exports = router;
