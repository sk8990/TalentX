const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const { createOrder, verifyPayment } = require("../controllers/paymentController");

router.post("/create-order", auth, role("recruiter"), createOrder);
router.post("/verify", auth, role("recruiter"), verifyPayment);

module.exports = router;
