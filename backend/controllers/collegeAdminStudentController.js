const mongoose = require("mongoose");
const Student = require("../models/Student");
const User = require("../models/User");
const College = require("../models/College");
const { notify } = require("../services/notificationService");
const { sendEmail, emailTemplates } = require("../services/emailService");

const SAFE_USER_FIELDS = "_id name email createdAt";

function buildStudentQuery(collegeId, verificationStatus) {
  const q = {
    studentType: "college_student",
    collegeId: collegeId,
    collegeVerificationStatus: verificationStatus
  };
  if (verificationStatus === "approved") {
    q.isCollegeVerified = true;
  }
  return q;
}

const SAFE_STUDENT_SELECT =
  "userId studentType collegeId collegeName collegeVerificationStatus isCollegeVerified accessLevel createdAt";

function emailWarningFor(result) {
  return result?.success === false ? "Student approved but email could not be sent." : undefined;
}

// ─── GET /api/college-admin/pending-students ───
exports.getPendingStudents = async (req, res) => {
  try {
    const collegeId = req.collegeAdminUser.collegeId;

    const students = await Student.find(buildStudentQuery(collegeId, "pending"))
      .select(SAFE_STUDENT_SELECT)
      .populate("userId", SAFE_USER_FIELDS)
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ students });
  } catch (err) {
    console.error("getPendingStudents error:", err);
    return res.status(500).json({ message: "Unable to load pending students." });
  }
};

// ─── GET /api/college-admin/approved-students ───
exports.getApprovedStudents = async (req, res) => {
  try {
    const collegeId = req.collegeAdminUser.collegeId;

    const students = await Student.find(buildStudentQuery(collegeId, "approved"))
      .select(SAFE_STUDENT_SELECT)
      .populate("userId", SAFE_USER_FIELDS)
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ students });
  } catch (err) {
    console.error("getApprovedStudents error:", err);
    return res.status(500).json({ message: "Unable to load approved students." });
  }
};

// ─── GET /api/college-admin/rejected-students ───
exports.getRejectedStudents = async (req, res) => {
  try {
    const collegeId = req.collegeAdminUser.collegeId;

    const students = await Student.find(buildStudentQuery(collegeId, "rejected"))
      .select(SAFE_STUDENT_SELECT)
      .populate("userId", SAFE_USER_FIELDS)
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ students });
  } catch (err) {
    console.error("getRejectedStudents error:", err);
    return res.status(500).json({ message: "Unable to load rejected students." });
  }
};

// ─── POST /api/college-admin/students/:id/approve ───
exports.approveStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const collegeId = req.collegeAdminUser.collegeId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid student ID." });
    }

    const student = await Student.findById(id).populate("userId", "_id role name email");

    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    if (!student.userId || student.userId.role !== "student") {
      return res.status(400).json({ message: "This user is not a student." });
    }

    if (student.studentType !== "college_student") {
      return res.status(400).json({ message: "Only college students can be approved." });
    }

    if (!student.collegeId || student.collegeId.toString() !== collegeId.toString()) {
      return res.status(403).json({ message: "You can only approve students from your own college." });
    }

    const college = await College.findById(collegeId).select("name enterprisePlanActive status").lean();
    if (!college || college.status !== "active" || college.enterprisePlanActive !== true) {
      return res.status(400).json({ message: "This college is not active on TalentX Enterprise." });
    }

    if (!["pending", "rejected"].includes(student.collegeVerificationStatus)) {
      return res.status(400).json({
        message: `Student is already ${student.collegeVerificationStatus}. Only pending or rejected students can be approved.`
      });
    }

    student.collegeVerificationStatus = "approved";
    student.isCollegeVerified = true;
    student.accessLevel = "full";
    await student.save();

    // Send notification to student
    try {
      await notify({
        userId: student.userId._id,
        type: "GENERAL",
        title: "College Verification Approved",
        message: "Your college verification is approved. You now have full access to TalentX.",
        link: "/student/dashboard",
        sendMail: false
      });
    } catch (_notifErr) {
      // Non-critical: do not fail the approval if notification fails
    }

    const emailResult = student.userId?.email
      ? await sendEmail({
          to: student.userId.email,
          ...emailTemplates.collegeStudentApprovedEmail({
            name: student.userId.name,
            email: student.userId.email,
            collegeName: student.collegeName || college?.name
          })
        })
      : { success: false, error: "Student email unavailable", skipped: true };

    return res.json({
      message: "Student approved successfully.",
      emailSent: Boolean(emailResult.success),
      emailWarning: emailWarningFor(emailResult)
    });
  } catch (err) {
    console.error("approveStudent error:", err);
    return res.status(500).json({ message: "Unable to approve student." });
  }
};

// ─── POST /api/college-admin/students/:id/reject ───
exports.rejectStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const collegeId = req.collegeAdminUser.collegeId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid student ID." });
    }

    const student = await Student.findById(id).populate("userId", "_id role name");

    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    if (!student.userId || student.userId.role !== "student") {
      return res.status(400).json({ message: "This user is not a student." });
    }

    if (student.studentType !== "college_student") {
      return res.status(400).json({ message: "Only college students can be rejected." });
    }

    if (!student.collegeId || student.collegeId.toString() !== collegeId.toString()) {
      return res.status(403).json({ message: "You can only reject students from your own college." });
    }

    student.collegeVerificationStatus = "rejected";
    student.isCollegeVerified = false;
    student.accessLevel = "limited";
    await student.save();

    // Send notification to student
    try {
      await notify({
        userId: student.userId._id,
        type: "GENERAL",
        title: "College Verification Rejected",
        message: "Your college verification was rejected. You can continue as an Open Student with limited access.",
        link: "/student/dashboard",
        sendMail: false
      });
    } catch (_notifErr) {
      // Non-critical
    }

    return res.json({ message: "Student rejected successfully." });
  } catch (err) {
    console.error("rejectStudent error:", err);
    return res.status(500).json({ message: "Unable to reject student." });
  }
};
