const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const role = require('../middleware/roleMiddleware');
const supportUpload = require("../middleware/supportUpload");
const {
  askAI,
  createTicket,
  createRecruiterTicket,
  getMyTickets,
  getMyRecruiterTickets,
  getAllTickets,
  respondTicket
} = require('../controllers/supportController');

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
router.get("/tickets/my", auth, role("student"), getMyTickets);
router.get("/student/tickets", auth, role("student"), getMyTickets);
router.post("/recruiter/ticket", auth, role("recruiter"), (req, res, next) => {
  supportUpload.single("screenshot")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || "Screenshot upload failed" });
    }
    next();
  });
}, createRecruiterTicket);
router.get("/recruiter/my", auth, role("recruiter"), getMyRecruiterTickets);

router.get('/admin', auth, role('admin'), getAllTickets);
router.put('/admin/:id/respond', auth, role('admin'), respondTicket);

module.exports = router;
