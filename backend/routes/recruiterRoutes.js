const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const requireFeature = require("../middleware/requireFeature");
const requireApprovedRecruiter = require("../middleware/requireApprovedRecruiter");
const College = require("../models/College");
const User = require("../models/User");
const {
  getRecruiterInterviewers,
  createRecruiterInterviewer,
  updateRecruiterInterviewer,
  deactivateRecruiterInterviewer,
  resendRecruiterInterviewerCredentials
} = require("../controllers/interviewerController");

router.get("/approval-status", auth, role("recruiter"), async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("name email role companyName companyEmail companyWebsite recruiterApprovalStatus")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "Recruiter not found" });
    }

    const recruiterApprovalStatus = user.recruiterApprovalStatus || "pending";
    const isRecruiterApproved = recruiterApprovalStatus === "approved";

    return res.json({
      _id: user._id,
      name: user.name || "",
      email: user.email || "",
      role: user.role,
      companyName: user.companyName || "",
      companyEmail: user.companyEmail || user.email || "",
      companyWebsite: user.companyWebsite || "",
      recruiterApprovalStatus,
      isRecruiterApproved
    });
  } catch (err) {
    console.error("recruiter approval-status error:", err);
    return res.status(500).json({ message: "Unable to load recruiter approval status" });
  }
});

// Recruiter stats: use /api/company/recruiter/stats (companyRoutes.js)

// Recruiter-managed interviewers
router.get("/interviewers", auth, role("recruiter"), requireApprovedRecruiter, requireFeature("humanInterviewPanel"), getRecruiterInterviewers);
router.post("/interviewers", auth, role("recruiter"), requireApprovedRecruiter, requireFeature("humanInterviewPanel"), createRecruiterInterviewer);
router.put("/interviewers/:id", auth, role("recruiter"), requireApprovedRecruiter, requireFeature("humanInterviewPanel"), updateRecruiterInterviewer);
router.delete("/interviewers/:id", auth, role("recruiter"), requireApprovedRecruiter, requireFeature("humanInterviewPanel"), deactivateRecruiterInterviewer);
router.post(
  "/interviewers/:id/resend-credentials",
  auth,
  role("recruiter"),
  requireApprovedRecruiter,
  requireFeature("humanInterviewPanel"),
  resendRecruiterInterviewerCredentials
);

// Recruiter applications are fetched per-job via /api/application/job/:jobId (applicationRoutes.js)

// Active colleges for job targeting (approved recruiters only)
router.get("/active-colleges", auth, role("recruiter"), requireApprovedRecruiter, async (_req, res) => {
  try {
    const colleges = await College.find(
      { enterprisePlanActive: true, status: "active" },
      { _id: 1, name: 1, domain: 1 }
    )
      .sort({ name: 1 })
      .lean();

    res.json({ colleges });
  } catch (err) {
    console.error("recruiter active-colleges error:", err);
    res.status(500).json({ message: "Unable to load colleges" });
  }
});

module.exports = router;
