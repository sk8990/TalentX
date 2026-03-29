const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const {
  register,
  login,
  forgotPassword,
  resetPassword,
  interviewerResetPassword
} = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/interviewer/reset-password", auth, role("interviewer"), interviewerResetPassword);

module.exports = router;
