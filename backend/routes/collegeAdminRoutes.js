const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const requireCollegeAdmin = require("../middleware/requireCollegeAdmin");

const {
  getPendingStudents,
  getApprovedStudents,
  getRejectedStudents,
  approveStudent,
  rejectStudent,
  disableStudent,
  enableStudent
} = require("../controllers/collegeAdminStudentController");

const {
  getCollegeProfile,
  getPlacementReports
} = require("../controllers/collegeAdminProfileController");

const {
  getCollegeJobs
} = require("../controllers/collegeAdminJobController");

// All routes require auth + college admin
router.use(auth, requireCollegeAdmin);

// College profile
router.get("/profile", getCollegeProfile);

// Student verification
router.get("/pending-students", getPendingStudents);
router.get("/approved-students", getApprovedStudents);
router.get("/rejected-students", getRejectedStudents);
router.post("/students/:id/approve", approveStudent);
router.post("/students/:id/reject", rejectStudent);
router.post("/students/:id/disable", disableStudent);
router.post("/students/:id/enable", enableStudent);

// College jobs / drives
router.get("/jobs", getCollegeJobs);

// Placement reports
router.get("/placement-reports", getPlacementReports);

module.exports = router;
