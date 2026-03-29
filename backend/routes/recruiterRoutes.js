const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const { getRecruiterStats } = require("../controllers/companyController");
const {
  getRecruiterInterviewers,
  createRecruiterInterviewer,
  updateRecruiterInterviewer,
  deactivateRecruiterInterviewer,
  resendRecruiterInterviewerCredentials
} = require("../controllers/interviewerController");

// Use the centralized stats controller instead of inline logic
router.get("/stats", auth, role("recruiter"), getRecruiterStats);

// Recruiter-managed interviewers
router.get("/interviewers", auth, role("recruiter"), getRecruiterInterviewers);
router.post("/interviewers", auth, role("recruiter"), createRecruiterInterviewer);
router.put("/interviewers/:id", auth, role("recruiter"), updateRecruiterInterviewer);
router.delete("/interviewers/:id", auth, role("recruiter"), deactivateRecruiterInterviewer);
router.post(
  "/interviewers/:id/resend-credentials",
  auth,
  role("recruiter"),
  resendRecruiterInterviewerCredentials
);

// Recruiter Applications
router.get("/applications", auth, role("recruiter"), async (req, res) => {
  try {
    const Application = require("../models/Application");
    const Job = require("../models/Job");

    const recruiterId = req.user.id;
    const jobs = await Job.find({ recruiterId });
    const jobIds = jobs.map(job => job._id);

    const applications = await Application.find({
      jobId: { $in: jobIds }
    }).populate("studentId jobId");

    res.json(applications);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch applications" });
  }
});

module.exports = router;
