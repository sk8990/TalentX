const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const requireInterviewerPasswordChanged = require("../middleware/requireInterviewerPasswordChanged");
const {
  getMyAssignedInterviews,
  getMyInterviewRoomAccess,
  getMyInterviewJoinRequest,
  decideMyInterviewJoinRequest,
  rescheduleMyInterview,
  endMyInterview,
  submitMyInterviewFeedback
} = require("../controllers/interviewerController");

router.use(auth, role("interviewer"), requireInterviewerPasswordChanged);

router.get("/interviews", getMyAssignedInterviews);
router.get("/interviews/:applicationId/room", getMyInterviewRoomAccess);
router.get("/interviews/:applicationId/join-request", getMyInterviewJoinRequest);
router.put("/interviews/:applicationId/join-request", decideMyInterviewJoinRequest);
router.post("/interviews/:applicationId/reschedule", rescheduleMyInterview);
router.post("/interviews/:applicationId/end", endMyInterview);
router.post("/interviews/:applicationId/feedback", submitMyInterviewFeedback);

module.exports = router;
