const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const role = require('../middleware/roleMiddleware');
const supportUpload = require("../middleware/supportUpload");
const requireFeature = require("../middleware/requireFeature");
const {
  askAI,
  createTicket,
  createRecruiterTicket,
  createCollegeAdminTicket,
  getMyTickets,
  getMyRecruiterTickets,
  getCollegeAdminTickets,
  getAllTickets,
  respondCollegeTicket,
  respondTicket
} = require('../controllers/supportController');

function uploadScreenshot(req, res, next) {
  supportUpload.single("screenshot")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || "Screenshot upload failed" });
    }
    return next();
  });
}

function requirePlatformSupportAccess(req, res, next) {
  if (req.user?.role === "super_admin") {
    return next();
  }

  if (req.user?.role === "admin") {
    return requireFeature("adminDashboard")(req, res, next);
  }

  if (req.user?.role === "university_admin") {
    return res.status(403).json({
      message: "University Admin cannot access the platform-wide support queue in this demo."
    });
  }

  return res.status(403).json({ message: "Access forbidden" });
}

// Student routes
router.post('/ask-ai', auth, role('student'), askAI);
router.post("/ticket", auth, role("student"), uploadScreenshot, createTicket);
router.get("/my", auth, role("student"), getMyTickets);

// Recruiter routes
router.post("/recruiter/ticket", auth, role("recruiter"), uploadScreenshot, createRecruiterTicket);
router.get("/recruiter/my", auth, role("recruiter"), getMyRecruiterTickets);

// College Admin routes
router.get("/college-admin", auth, role("college_admin"), getCollegeAdminTickets);
router.post("/college-admin/ticket", auth, role("college_admin"), uploadScreenshot, createCollegeAdminTicket);
router.put("/college-admin/:id/respond", auth, role("college_admin"), respondCollegeTicket);

// Admin routes
router.get('/admin', auth, requirePlatformSupportAccess, getAllTickets);
router.put('/admin/:id/respond', auth, requirePlatformSupportAccess, respondTicket);

module.exports = router;
