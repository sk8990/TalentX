const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const {
  getMyAssignedInterviews,
  getMyInterviewRoomAccess,
  rescheduleMyInterview,
  submitMyInterviewFeedback
} = require("../controllers/interviewerController");

router.get("/interviews", auth, role("interviewer"), getMyAssignedInterviews);
router.get("/interviews/:applicationId/room", auth, role("interviewer"), getMyInterviewRoomAccess);
router.post("/interviews/:applicationId/reschedule", auth, role("interviewer"), rescheduleMyInterview);
router.post(
  "/interviews/:applicationId/feedback",
  auth,
  role("interviewer"),
  submitMyInterviewFeedback
);

module.exports = router;
