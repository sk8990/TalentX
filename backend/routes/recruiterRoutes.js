const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const Application = require("../models/Application");
const Job = require("../models/Job");

// Recruiter Stats
router.get("/stats", auth, role("recruiter"), async (req, res) => {
  try {
    const recruiterId = req.user.id;

    const jobs = await Job.find({ recruiterId });
    const jobIds = jobs.map(job => job._id);

    const applications = await Application.find({
      jobId: { $in: jobIds }
    });

    res.json({
      jobs: jobs.length,
      applications: applications.length,
      shortlisted: applications.filter(a => a.status === "SHORTLISTED").length,
      selected: applications.filter(a => a.status === "SELECTED").length,
      accepted: applications.filter(a => a.status === "ACCEPTED").length,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});

// Recruiter Applications
router.get("/applications", auth, role("recruiter"), async (req, res) => {
  try {
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
