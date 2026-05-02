const College = require("../models/College");
const Student = require("../models/Student");
const Application = require("../models/Application");

// ─── GET /api/college-admin/profile ───
exports.getCollegeProfile = async (req, res) => {
  try {
    const collegeId = req.collegeAdminUser.collegeId;

    const college = await College.findById(collegeId)
      .select("_id name domain enterprisePlanActive enterprisePlanStartDate enterprisePlanEndDate status createdAt updatedAt")
      .lean();

    if (!college) {
      return res.status(404).json({ message: "College not found." });
    }

    const baseQuery = { studentType: "college_student", collegeId: collegeId };

    const [totalStudents, pendingStudents, approvedStudents, rejectedStudents] = await Promise.all([
      Student.countDocuments(baseQuery),
      Student.countDocuments({ ...baseQuery, collegeVerificationStatus: "pending" }),
      Student.countDocuments({ ...baseQuery, collegeVerificationStatus: "approved", isCollegeVerified: true }),
      Student.countDocuments({ ...baseQuery, collegeVerificationStatus: "rejected" })
    ]);

    return res.json({
      college,
      counts: {
        totalStudents,
        pendingStudents,
        approvedStudents,
        rejectedStudents
      }
    });
  } catch (err) {
    console.error("getCollegeProfile error:", err);
    return res.status(500).json({ message: "Unable to load college profile." });
  }
};

// ─── GET /api/college-admin/placement-reports ───
exports.getPlacementReports = async (req, res) => {
  try {
    const collegeId = req.collegeAdminUser.collegeId;

    const baseQuery = { studentType: "college_student", collegeId: collegeId };

    const [totalStudents, pendingStudents, approvedStudents, rejectedStudents] = await Promise.all([
      Student.countDocuments(baseQuery),
      Student.countDocuments({ ...baseQuery, collegeVerificationStatus: "pending" }),
      Student.countDocuments({ ...baseQuery, collegeVerificationStatus: "approved", isCollegeVerified: true }),
      Student.countDocuments({ ...baseQuery, collegeVerificationStatus: "rejected" })
    ]);

    // Get approved student IDs for application stats
    const approvedStudentIds = await Student.find({
      ...baseQuery,
      collegeVerificationStatus: "approved",
      isCollegeVerified: true
    })
      .select("_id")
      .lean();

    const studentObjectIds = approvedStudentIds.map((s) => s._id);

    let totalApplications = 0;
    let interviewScheduled = 0;
    let selectedStudents = 0;
    let rejectedApplications = 0;

    if (studentObjectIds.length > 0) {
      const [appTotal, interviewCount, selectedCount, rejectedCount] = await Promise.all([
        Application.countDocuments({ studentId: { $in: studentObjectIds } }),
        Application.countDocuments({ studentId: { $in: studentObjectIds }, status: "INTERVIEW_SCHEDULED" }),
        Application.countDocuments({ studentId: { $in: studentObjectIds }, status: "SELECTED" }),
        Application.countDocuments({ studentId: { $in: studentObjectIds }, status: "REJECTED" })
      ]);

      totalApplications = appTotal;
      interviewScheduled = interviewCount;
      selectedStudents = selectedCount;
      rejectedApplications = rejectedCount;
    }

    return res.json({
      totalStudents,
      pendingStudents,
      approvedStudents,
      rejectedStudents,
      totalApplications,
      interviewScheduled,
      selectedStudents,
      rejectedApplications
    });
  } catch (err) {
    console.error("getPlacementReports error:", err);
    return res.status(500).json({ message: "Unable to load placement reports." });
  }
};
