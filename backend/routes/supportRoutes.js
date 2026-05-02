const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const role = require('../middleware/roleMiddleware');
const supportUpload = require("../middleware/supportUpload");
const requireFeature = require("../middleware/requireFeature");
const {
  askAI,
  createTicket,
  createRecruiterTicket,
  getMyTickets,
  getMyRecruiterTickets,
  getAllTickets,
  respondTicket
} = require('../controllers/supportController');

function blockUniversityAdminPlatformSupport(req, res, next) {
  if (req.user?.role === "university_admin") {
    return res.status(403).json({
      message: "University Admin cannot access the platform-wide support queue in this demo."
    });
  }
  return next();
}

// Student routes
router.post('/ask-ai', auth, role('student'), askAI);
router.post("/ticket", auth, role("student"), (req, res, next) => {
  supportUpload.single("screenshot")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || "Screenshot upload failed" });
    }
    next();
  });
}, createTicket);
router.get("/my", auth, role("student"), getMyTickets);

// Recruiter routes
router.post("/recruiter/ticket", auth, role("recruiter"), (req, res, next) => {
  supportUpload.single("screenshot")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || "Screenshot upload failed" });
    }
    next();
  });
}, createRecruiterTicket);
router.get("/recruiter/my", auth, role("recruiter"), getMyRecruiterTickets);

// Admin routes
router.get('/admin', auth, role('admin'), blockUniversityAdminPlatformSupport, requireFeature("adminDashboard"), getAllTickets);
router.put('/admin/:id/respond', auth, role('admin'), blockUniversityAdminPlatformSupport, requireFeature("adminDashboard"), respondTicket);

module.exports = router;
