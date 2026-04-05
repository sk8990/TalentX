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
  rescheduleInterview,
  publishInterviewSlots,
  bookInterviewSlot,
  selectCandidate,
  rejectCandidate,
  getMyApplications,
  respondToOffer,
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

router.post("/apply", auth, role("student"), profileComplete, upload.single("resume"), applyJob);

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


router.get("/job/:jobId", auth, role("recruiter"), getApplicationsByJob);

router.put("/:applicationId/shortlist", auth, role("recruiter"), shortlistApplication);

router.put("/:applicationId/assessment", auth, role("recruiter"), sendAssessment);

router.put("/:applicationId/assessment/result", auth, role("recruiter"), updateAssessmentResult);

router.put("/:applicationId/interview", auth, role("recruiter"), scheduleInterview);

router.put("/:applicationId/interview/reschedule", auth, role("recruiter"), rescheduleInterview);

router.put("/:applicationId/interview/slots", auth, role("recruiter"), publishInterviewSlots);

router.put(
  "/:applicationId/interviewer/assign",
  auth,
  role("recruiter"),
  assignInterviewerToApplication
);

router.put(
  "/:applicationId/interviewer/unassign",
  auth,
  role("recruiter"),
  unassignInterviewerFromApplication
);

router.put("/:applicationId/interview/book", auth, role("student"), bookInterviewSlot);

router.put("/:applicationId/select", auth, role("recruiter"), selectCandidate);

router.put("/:applicationId/reject", auth, role("recruiter"), rejectCandidate);

router.put("/:applicationId/offer", auth, role("recruiter"), generateOffer);

router.put("/:applicationId/offer/respond", auth, role("student"), respondToOffer);

module.exports = router;
