const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const {
  getMyAssignedInterviews,
  getMyInterviewRoomAccess,
  getMyInterviewJoinRequest,
  decideMyInterviewJoinRequest,
  rescheduleMyInterview,
  submitMyInterviewFeedback
} = require("../controllers/interviewerController");

router.get("/interviews", auth, role("interviewer"), getMyAssignedInterviews);
router.get("/interviews/:applicationId/room", auth, role("interviewer"), getMyInterviewRoomAccess);
router.get("/interviews/:applicationId/join-request", auth, role("interviewer"), getMyInterviewJoinRequest);
router.put("/interviews/:applicationId/join-request", auth, role("interviewer"), decideMyInterviewJoinRequest);
router.post("/interviews/:applicationId/reschedule", auth, role("interviewer"), rescheduleMyInterview);
router.post(
  "/interviews/:applicationId/feedback",
  auth,
  role("interviewer"),
  submitMyInterviewFeedback
);

module.exports = router;
