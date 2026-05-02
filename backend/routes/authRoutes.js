const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const {
  register,
  login,
  forgotPassword,
  resetPassword,
  interviewerResetPassword,
  changeEmail,
  changePassword
} = require("../controllers/authController");

router.post("/register", register);
router.post("/signup/student", (req, res) => {
  req.body = { ...req.body, role: "student" };
  return register(req, res);
});
router.post("/signup/recruiter", (req, res) => {
  req.body = { ...req.body, role: "recruiter" };
  return register(req, res);
});
router.post("/login", login);

// Lightweight token verification – the frontend calls this on page load to
// confirm a stored token is still valid on the server side.
router.get("/verify", auth, (req, res) => {
  res.json({ valid: true, role: req.user.role });
});

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/interviewer/reset-password", auth, role("interviewer"), interviewerResetPassword);
router.post("/change-email", auth, changeEmail);
router.post("/change-password", auth, changePassword);

module.exports = router;
