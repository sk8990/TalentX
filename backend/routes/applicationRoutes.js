const router = require("express").Router();
const mongoose = require("mongoose");
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const upload = require("../middleware/upload.js");
const profileComplete = require("../middleware/profileComplete");
const requireFeature = require("../middleware/requireFeature");
const { enforceLimit } = require("../middleware/packageLimits");
const { withUsageIncrement } = require("../middleware/usageTracker");
const requireApprovedRecruiter = require("../middleware/requireApprovedRecruiter");
const { requireApplicantMonthlyLimit } = require("../middleware/requireJobLimit");

const {
  applyJob,
  getApplicationsByJob,
  shortlistApplication,
  sendAssessment,
  updateAssessmentResult,
  scheduleInterview,
  rescheduleInterview,
  publishInterviewSlots,
  bookInterviewSlot,
  selectCandidate,
  rejectCandidate,
  getMyApplications,
  respondToOffer,
  downloadOfferLetter,
  generateOffer,
  getMyInterviews,
  getMyInterviewRoom,
  requestMyInterviewJoinApproval,
  getMyInterviewJoinApprovalStatus,
  startMyAIInterview,
  submitMyAIInterviewAnswer,
  getNextMyAIInterviewQuestion,
  endMyAIInterview,
  getMyInterviewSlots,
  getMyAssessments,
  assignInterviewerToApplication,
  unassignInterviewerFromApplication
} = require("../controllers/applicationController");

function validateObjectIdParam(paramName) {
  return (req, res, next, value) => {
    if (!mongoose.Types.ObjectId.isValid(String(value))) {
      return res.status(400).json({ message: `Invalid ${paramName} format` });
    }

    return next();
  };
}

router.param("applicationId", validateObjectIdParam("applicationId"));
router.param("jobId", validateObjectIdParam("jobId"));

router.post("/apply", auth, role("student"), profileComplete, upload.single("resume"), requireApplicantMonthlyLimit, applyJob);

router.get("/my", auth, role("student"), getMyApplications);

router.get(
  "/my/interviews",
  auth,
  role("student"),
  getMyInterviews
);

router.get(
  "/:applicationId/interview/room",
  auth,
  role("student"),
  getMyInterviewRoom
);

router.post(
  "/:applicationId/interview/join-request",
  auth,
  role("student"),
  requestMyInterviewJoinApproval
);

router.get(
  "/:applicationId/interview/join-request",
  auth,
  role("student"),
  getMyInterviewJoinApprovalStatus
);

router.post(
  "/:applicationId/ai-interview/start",
  auth,
  role("student"),
  startMyAIInterview
);

router.post(
  "/:applicationId/ai-interview/answer",
  auth,
  role("student"),
  submitMyAIInterviewAnswer
);

router.post(
  "/:applicationId/ai-interview/next",
  auth,
  role("student"),
  getNextMyAIInterviewQuestion
);

router.post(
  "/:applicationId/ai-interview/end",
  auth,
  role("student"),
  endMyAIInterview
);

router.get(
  "/my/interview-slots",
  auth,
  role("student"),
  getMyInterviewSlots
);

router.get(
  "/my/assessments",
  auth,
  role("student"),
  getMyAssessments
);


router.get("/job/:jobId", auth, role("recruiter"), requireApprovedRecruiter, requireFeature("basicApplicantTracking"), getApplicationsByJob);

router.put("/:applicationId/shortlist", auth, role("recruiter"), requireApprovedRecruiter, requireFeature("basicApplicantTracking"), shortlistApplication);

router.put("/:applicationId/assessment", auth, role("recruiter"), requireApprovedRecruiter, requireFeature("assessmentPanel"), sendAssessment);

router.put("/:applicationId/assessment/result", auth, role("recruiter"), requireApprovedRecruiter, requireFeature("assessmentPanel"), updateAssessmentResult);

router.put(
  "/:applicationId/interview",
  auth,
  role("recruiter"),
  requireApprovedRecruiter,
  requireFeature("interviewScheduling"),
  enforceLimit("interview_scheduling"),
  withUsageIncrement(scheduleInterview, "interview_scheduling")
);

router.put("/:applicationId/interview/reschedule", auth, role("recruiter"), requireApprovedRecruiter, requireFeature("interviewScheduling"), rescheduleInterview);

router.put(
  "/:applicationId/interview/slots",
  auth,
  role("recruiter"),
  requireApprovedRecruiter,
  requireFeature("interviewScheduling"),
  enforceLimit("interview_scheduling"),
  withUsageIncrement(publishInterviewSlots, "interview_scheduling")
);

router.put(
  "/:applicationId/interviewer/assign",
  auth,
  role("recruiter"),
  requireApprovedRecruiter,
  requireFeature("humanInterviewPanel"),
  assignInterviewerToApplication
);

router.put(
  "/:applicationId/interviewer/unassign",
  auth,
  role("recruiter"),
  requireApprovedRecruiter,
  requireFeature("humanInterviewPanel"),
  unassignInterviewerFromApplication
);

router.put("/:applicationId/interview/book", auth, role("student"), bookInterviewSlot);

router.put("/:applicationId/select", auth, role("recruiter"), requireApprovedRecruiter, requireFeature("basicApplicantTracking"), selectCandidate);

router.put("/:applicationId/reject", auth, role("recruiter"), requireApprovedRecruiter, requireFeature("basicApplicantTracking"), rejectCandidate);

router.put(
  "/:applicationId/offer",
  auth,
  role("recruiter"),
  requireApprovedRecruiter,
  requireFeature("offerGeneration"),
  enforceLimit("offer_letter_generation"),
  withUsageIncrement(generateOffer, "offer_letter_generation")
);

router.put("/:applicationId/offer/respond", auth, role("student"), respondToOffer);
// requireApprovedRecruiter is intentionally omitted here.
// Ownership is enforced inside downloadOfferLetter:
//   - student: must own the application (studentId matches their Student doc)
//   - recruiter: must own the job (jobId.recruiterId matches their user id)
// Applying requireApprovedRecruiter to a student-accessible route adds a
// redundant DB query for every student download and is misleading.
router.get("/:applicationId/offer/download", auth, role("student", "recruiter"), downloadOfferLetter);

module.exports = router;
