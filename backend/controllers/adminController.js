const User = require("../models/User");
const Job = require("../models/Job");
const Application = require("../models/Application");
const AuditLog = require("../models/AuditLog");
const Student = require("../models/Student");
const { writeAuditLog } = require("../services/auditService");

// Roles that university_admin is not allowed to manage or view.
// Only super_admin can manage these accounts.
const PRIVILEGED_ROLES = ["super_admin", "admin", "university_admin", "college_admin"];

function buildUniversityJobQuery(collegeId) {
  return {
    $or: [
      { targetColleges: collegeId },
      { visibilityType: { $in: ["all_students", "college_plus_off_campus"] } }
    ]
  };
}

async function getCollegeStudentIds(collegeId) {
  if (!collegeId) return [];
  return Student.find({ collegeId }).distinct("_id");
}

/* ================= USERS ================= */

exports.getAllUsers = async (req, res) => {
  try {
    let query = { role: { $ne: "interviewer" } };

    // university_admin must not see privileged accounts (super_admin, admin,
    // university_admin, college_admin). They may only see students and recruiters.
    if (req.user.role === "university_admin") {
      query = { role: { $in: ["student", "recruiter"] } };
    }

    const users = await User.find(query).select("-password");
    res.json(users);
  } catch (err) {
    console.error("Admin getAllUsers error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Interviewers are managed by their recruiter, not by admin.
    if (user.role === "interviewer") {
      return res.status(403).json({ message: "Admin cannot manage interviewer accounts" });
    }

    // university_admin must not be able to disable privileged accounts.
    // Only super_admin can manage super_admin / admin / university_admin / college_admin.
    if (req.user.role === "university_admin" && PRIVILEGED_ROLES.includes(user.role)) {
      return res.status(403).json({
        message: "University Admin cannot manage privileged accounts. Contact Super Admin."
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    await writeAuditLog({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: user.isActive ? "USER_ENABLED" : "USER_DISABLED",
      entityType: "USER",
      entityId: user._id,
      metadata: {
        targetRole: user.role,
        targetEmail: user.email
      }
    });

    res.json(user);
  } catch (err) {
    console.error("Admin toggleUserStatus error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= JOBS ================= */

exports.getAllJobs = async (req, res) => {
  try {
    const query = {};
    if (req.user.role === "university_admin") {
      if (!req.user.collegeId) {
        return res.json([]);
      }
      Object.assign(query, buildUniversityJobQuery(req.user.collegeId));
    }

    const jobs = await Job.find(query).populate("recruiterId", "name email");
    res.json(jobs);
  } catch (err) {
    console.error("Admin getAllJobs error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteJob = async (req, res) => {
  try {
    if (req.user.role === "university_admin") {
      return res.status(403).json({
        message: "University Admin cannot delete platform jobs in this demo. Contact Super Admin."
      });
    }

    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    await Job.findByIdAndDelete(req.params.id);
    await Application.deleteMany({ jobId: req.params.id });

    await writeAuditLog({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "JOB_DELETED",
      entityType: "JOB",
      entityId: job._id,
      jobId: job._id,
      metadata: {
        companyName: job.companyName,
        title: job.title
      }
    });

    res.json({ message: "Job deleted" });
  } catch (err) {
    console.error("Admin deleteJob error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= STATS ================= */

exports.getPlatformStats = async (req, res) => {
  try {
    if (req.user.role === "university_admin") {
      if (!req.user.collegeId) {
        return res.json({ students: 0, recruiters: 0, jobs: 0, applications: 0, selected: 0 });
      }

      const [studentIds, jobIds, recruiterIds] = await Promise.all([
        getCollegeStudentIds(req.user.collegeId),
        Job.find(buildUniversityJobQuery(req.user.collegeId)).distinct("_id"),
        Job.find(buildUniversityJobQuery(req.user.collegeId)).distinct("recruiterId")
      ]);

      const [students, jobs, applications, selected] = await Promise.all([
        Student.countDocuments({ collegeId: req.user.collegeId }),
        Job.countDocuments({ _id: { $in: jobIds } }),
        Application.countDocuments({ studentId: { $in: studentIds } }),
        Application.countDocuments({ studentId: { $in: studentIds }, status: "SELECTED" })
      ]);

      return res.json({
        students,
        recruiters: recruiterIds.filter(Boolean).length,
        jobs,
        applications,
        selected
      });
    }

    const students = await User.countDocuments({ role: "student" });
    const recruiters = await User.countDocuments({ role: "recruiter" });
    const jobs = await Job.countDocuments();
    const applications = await Application.countDocuments();

    const selected = await Application.countDocuments({ status: "SELECTED" });

    res.json({ students, recruiters, jobs, applications, selected });
  } catch (err) {
    console.error("Admin getPlatformStats error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.reviewRecruiter = async (_req, res) => {
  // Intentionally disabled — recruiter approval is Super Admin only.
  return res.status(410).json({
    message: "Recruiter approvals are managed by Super Admin. Use the Super Admin panel."
  });
};

exports.getPendingRecruiters = async (_req, res) => {
  // Intentionally disabled — recruiter approval is Super Admin only.
  return res.status(410).json({
    message: "Recruiter approvals are managed by Super Admin. Use the Super Admin panel."
  });
};

exports.getSelectedCandidates = async (req, res) => {
  try {
    const query = { status: "SELECTED" };

    if (req.user.role === "university_admin") {
      if (!req.user.collegeId) {
        return res.json([]);
      }
      const studentIds = await getCollegeStudentIds(req.user.collegeId);
      query.studentId = { $in: studentIds };
    }

    const selectedApplications = await Application.find(query)
      .populate({
        path: "studentId",
        populate: { path: "userId", select: "name" }
      })
      .populate("jobId", "companyName ctc")
      .sort({ updatedAt: -1 });

    const data = selectedApplications.map((application) => ({
      _id: application._id,
      candidateName: application.studentId?.userId?.name || "N/A",
      companyName: application.jobId?.companyName || "N/A",
      package: application.jobId?.ctc ?? null
    }));

    res.json(data);
  } catch (err) {
    console.error("Admin getSelectedCandidates error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getAuditLogs = async (req, res) => {
  try {
    if (req.user.role === "university_admin") {
      return res.status(403).json({
        message: "University Admin cannot access platform-wide audit logs in this demo."
      });
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const action = String(req.query.action || "").trim();
    const entityType = String(req.query.entityType || "").trim();
    const actorRole = String(req.query.actorRole || "").trim();
    const from = String(req.query.from || "").trim();
    const to = String(req.query.to || "").trim();

    const query = {
      actorRole: { $ne: "interviewer" },
      entityType: { $nin: ["INTERVIEWER", "INTERVIEWER_ASSIGNMENT", "INTERVIEWER_FEEDBACK"] }
    };

    if (action) query.action = action;

    if (entityType && !["INTERVIEWER", "INTERVIEWER_ASSIGNMENT", "INTERVIEWER_FEEDBACK"].includes(entityType)) {
      query.entityType = entityType;
    }

    if (actorRole && actorRole !== "interviewer") {
      query.actorRole = actorRole;
    }

    if (from || to) {
      const createdAt = {};
      if (from) {
        const parsedFrom = new Date(from);
        if (!Number.isNaN(parsedFrom.getTime())) createdAt.$gte = parsedFrom;
      }
      if (to) {
        const parsedTo = new Date(to);
        if (!Number.isNaN(parsedTo.getTime())) {
          parsedTo.setHours(23, 59, 59, 999);
          createdAt.$lte = parsedTo;
        }
      }
      if (Object.keys(createdAt).length) query.createdAt = createdAt;
    }

    const [items, total] = await Promise.all([
      AuditLog.find(query)
        .populate("actorId", "name email role")
        .populate("jobId", "title companyName")
        .populate("applicationId", "status")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments(query)
    ]);

    res.json({ items, page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) });
  } catch (err) {
    console.error("Admin getAuditLogs error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
