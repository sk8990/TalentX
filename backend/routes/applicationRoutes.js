const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const upload = require("../middleware/upload.js");
const profileComplete = require("../middleware/profileComplete");

const {
  applyJob,
  getApplicationsByJob,
  shortlistApplication,
  sendAssessment,
  updateAssessmentResult,
  scheduleInterview,
  selectCandidate,
  rejectCandidate,
  getMyApplications,
  respondToOffer,
  generateOffer,
  getMyInterviews,
  getMyAssessments
} = require("../controllers/applicationController");

router.post("/apply", auth, role("student"), profileComplete, upload.single("resume"), applyJob);

router.get("/my", auth, role("student"), getMyApplications);

router.get(
  "/my/interviews",
  auth,
  role("student"),
  getMyInterviews
);

router.get(
  "/my/assessments",
  auth,
  role("student"),
  getMyAssessments
);


router.get("/job/:jobId", auth, role("recruiter"), getApplicationsByJob);

router.put("/:applicationId/shortlist", auth, role("recruiter"), shortlistApplication);

router.put("/:applicationId/assessment", auth, role("recruiter"), sendAssessment);

router.put("/:applicationId/assessment/result", auth, role("recruiter"), updateAssessmentResult);

router.put("/:applicationId/interview", auth, role("recruiter"), scheduleInterview);

router.put("/:applicationId/select", auth, role("recruiter"), selectCandidate);

router.put("/:applicationId/reject", auth, role("recruiter"), rejectCandidate);

router.put("/:applicationId/offer", auth, role("recruiter"), generateOffer);

router.put("/:applicationId/offer/respond", auth, role("student"), respondToOffer);

module.exports = router;
