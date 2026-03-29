const User = require("../models/User");
const Job = require("../models/Job");
const Application = require("../models/Application");
const AuditLog = require("../models/AuditLog");
const { notifyRecruiterApproved } = require("../services/notificationService");

/* ================= USERS ================= */

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: "interviewer" } }).select("-password");
    res.json(users);
  } catch (err) {
    console.error("Admin getAllUsers error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user)
      return res.status(404).json({ message: "User not found" });

    if (user.role === "interviewer") {
      return res.status(403).json({ message: "Admin cannot manage interviewer accounts" });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json(user);
  } catch (err) {
    console.error("Admin toggleUserStatus error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= JOBS ================= */

exports.getAllJobs = async (req, res) => {
  try {
    const jobs = await Job.find().populate("recruiterId", "name email");
    res.json(jobs);
  } catch (err) {
    console.error("Admin getAllJobs error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteJob = async (req, res) => {
  try {
    await Job.findByIdAndDelete(req.params.id);
    await Application.deleteMany({ jobId: req.params.id });

    res.json({ message: "Job deleted" });
  } catch (err) {
    console.error("Admin deleteJob error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= STATS ================= */

exports.getPlatformStats = async (req, res) => {
  try {
    const students = await User.countDocuments({ role: "student" });
    const recruiters = await User.countDocuments({ role: "recruiter" });
    const jobs = await Job.countDocuments();
    const applications = await Application.countDocuments();

    const selected = await Application.countDocuments({
      status: "SELECTED",
  });


    res.json({
      students,
      recruiters,
      jobs,
      applications,
      selected
    });
  } catch (err) {
    console.error("Admin getPlatformStats error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.reviewRecruiter = async (req, res) => {
  try {
    const { action } = req.body;

    if (!["APPROVE", "REJECT"].includes(action)) {
      return res.status(400).json({ message: "Invalid action" });
    }

    const user = await User.findById(req.params.id);

    if (!user || user.role !== "recruiter") {
      return res.status(404).json({ message: "Recruiter not found" });
    }

    if (user.isApproved) {
      return res.status(400).json({
        message: "Recruiter already approved"
      });
    }

    if (action === "APPROVE") {
      user.isApproved = true;
      await user.save();
      notifyRecruiterApproved(user._id.toString(), user.name || "Recruiter").catch((err) => {
        console.error("[NOTIFY] recruiter approval failed:", err.message);
      });

      return res.json({
        message: "Recruiter approved successfully"
      });
    }

    if (action === "REJECT") {
      await User.findByIdAndDelete(user._id);

      return res.json({
        message: "Recruiter rejected and deleted"
      });
    }

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getPendingRecruiters = async (req, res) => {
  try {
    const recruiters = await User.find({
      role: "recruiter",
      isApproved: false
    }).select("-password");

    res.json(recruiters);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getSelectedCandidates = async (req, res) => {
  try {
    const selectedApplications = await Application.find({ status: "SELECTED" })
      .populate({
        path: "studentId",
        populate: {
          path: "userId",
          select: "name"
        }
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

    if (action) {
      query.action = action;
    }

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
        if (!Number.isNaN(parsedFrom.getTime())) {
          createdAt.$gte = parsedFrom;
        }
      }

      if (to) {
        const parsedTo = new Date(to);
        if (!Number.isNaN(parsedTo.getTime())) {
          parsedTo.setHours(23, 59, 59, 999);
          createdAt.$lte = parsedTo;
        }
      }

      if (Object.keys(createdAt).length) {
        query.createdAt = createdAt;
      }
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

    res.json({
      items,
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1)
    });
  } catch (err) {
    console.error("Admin getAuditLogs error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
