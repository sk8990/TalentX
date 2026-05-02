const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const requireFeature = require("../middleware/requireFeature");
const requireApprovedRecruiter = require("../middleware/requireApprovedRecruiter");
const { bulkUpdateStatus } = require("../controllers/bulkController");

// F9: Bulk actions
router.put("/applications/bulk-status", auth, role("recruiter"), requireApprovedRecruiter, requireFeature("bulkStudentManagement"), bulkUpdateStatus);

module.exports = router;
