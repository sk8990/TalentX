const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const {
  getMySubscription,
  manualActivate,
  cancelSubscription
} = require("../controllers/subscriptionController");

router.get("/me", auth, getMySubscription);
router.post("/manual-activate", auth, role("super_admin"), manualActivate);
router.patch("/cancel", auth, cancelSubscription);

module.exports = router;
