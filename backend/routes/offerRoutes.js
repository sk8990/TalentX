const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const requireFeature = require("../middleware/requireFeature");
const { enforceLimit } = require("../middleware/packageLimits");
const { withUsageIncrement } = require("../middleware/usageTracker");
const { generateOffer } = require("../controllers/offerController");

router.post(
  "/:applicationId/generate-offer",
  auth,
  role("recruiter"),
  requireFeature("offerGeneration"),
  enforceLimit("offer_letter_generation"),
  withUsageIncrement(generateOffer, "offer_letter_generation")
);

module.exports = router;
