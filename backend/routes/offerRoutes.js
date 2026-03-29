const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const { generateOffer } = require("../controllers/offerController");

router.post("/:applicationId/generate-offer", auth, role("recruiter"), generateOffer);

module.exports = router;
