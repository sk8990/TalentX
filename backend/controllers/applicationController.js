const Application = require("../models/Application");
const Job = require("../models/Job");
const Student = require("../models/Student");
const User = require("../models/User");
const InterviewerProfile = require("../models/InterviewerProfile");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const generatePDF = require("../utils/generateOfferPDF");
const { expireJobsByDeadline } = require("../utils/jobExpiry");
const { writeAuditLog } = require("../services/auditService");
const {
  validateInterviewRoomAccess,
  getInterviewJoinRequest
} = require("../services/interviewRoomService");
const { buildInterviewAccess, getInterviewWindow } = require("../utils/interviewAccess");
const {
  notify,
  notifyApplicationStatus,
  notifyInterviewScheduled,
  notifyInterviewSlotsOpened,
  notifyInterviewSlotBooked,
  notifyOfferReceived
} = require("../services/notificationService");

function parseDateInput(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const normalized = raw.includes(" ") && !raw.includes("T")
    ? raw.replace(" ", "T")
    : raw;

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeWebLink(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

function normalizeInterviewMode(mode) {
  const value = String(mode || "").trim().toLowerCase();
  if (value === "online") return "Online";
  if (value === "offline") return "Offline";
  return "";
}

function hasInterviewerFeedback(app) {
  return Boolean(app?.interviewerFeedback?.submittedAt);
}

function buildStudentInterviewAccess(interview) {
  return buildInterviewAccess(interview);
}

function buildEmptyInterviewJoinRequest() {
  return {
    status: "NONE",
    requestedBy: null,
    requestedAt: null,
    decisionBy: null,
    decidedAt: null,
    rejectReason: ""
  };
}

function clearInterviewJoinRequest(app) {
  app.interviewJoinRequest = buildEmptyInterviewJoinRequest();
}

function getStudentNotificationContext(application) {
  const studentUser = application?.studentId?.userId;

  if (!studentUser) {
    return null;
  }

  if (typeof studentUser === "object") {
    if (!studentUser._id) {
      return null;
    }

    return {
      userId: studentUser._id.toString(),
      studentName: studentUser.name || "Student"
    };
  }

  return {
    userId: studentUser.toString(),
    studentName: "Student"
  };
}

function logNotificationError(scope, err) {
  console.error(`[NOTIFY] ${scope} failed:`, err.message);
}

function getBackendOrigin(req) {
  const explicitOrigin = String(process.env.BACKEND_PUBLIC_URL || "").trim();
  if (explicitOrigin) {
    return explicitOrigin.replace(/\/+$/, "");
  }

  return `${req.protocol}://${req.get("host")}`;
}

async function writeApplicationAudit({
  actorId,
  actorRole,
  action,
  app,
  changes = {},
  metadata = {},
  entityType = "APPLICATION",
  entityId = null
}) {
  await writeAuditLog({
    actorId,
    actorRole,
    action,
    entityType,
    entityId: entityId || app._id,
    applicationId: app._id,
    jobId: app.jobId?._id || app.jobId || null,
    changes,
    metadata
  });
}

/* =========================================
   APPLY JOB
========================================= */
exports.applyJob = async (req, res) => {
  try {
    const { jobId } = req.body;
    if (!jobId || !mongoose.Types.ObjectId.isValid(String(jobId))) {
      return res.status(400).json({ message: "Valid jobId is required" });
    }

    await expireJobsByDeadline();

    if (!req.file) {
      return res.status(400).json({ message: "Resume is required to Apply" });
    }

    const student = await Student.findOne({ userId: req.user.id });

    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    const job = await Job.findById(jobId).select("isActive deadline");
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (!job.isActive || new Date(job.deadline) < new Date()) {
      return res.status(400).json({ message: "Job deadline has passed. This job is inactive." });
    }

    const existing = await Application.findOne({
      studentId: student._id,
      jobId
    });

    if (existing) {
      return res.status(400).json({ message: "Already applied" });
    }

    const application = await Application.create({
      studentId: student._id,
      jobId,
      resumeUrl: `/uploads/${req.file.filename}`,
      status: "APPLIED"
    });

    res.status(201).json(application);
  } catch (err) {
    console.error("Error applying for job:", err);
    res.status(500).json({ error: err.message });
  }
};

/* =========================================
   STUDENT: GET MY APPLICATIONS
========================================= */
exports.getMyApplications = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.id });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const applications = await Application.find({
      studentId: student._id
    })
      .populate("jobId", "title")
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* =========================================
   RECRUITER: GET APPLICATIONS BY JOB
========================================= */
exports.getApplicationsByJob = async (req, res) => {
  try {
    const job = await Job.findOne({
      _id: req.params.jobId,
      recruiterId: req.user.id
    });

    if (!job) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const applications = await Application.find({
      jobId: job._id
    })
      .populate({
        path: "studentId",
        populate: { path: "userId", select: "name email" }
      })
      .populate("interviewerAssignment.interviewerUserId", "name email")
      .populate("interviewerFeedback.submittedBy", "name email");

    res.json(applications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* =========================================
   STATUS UPDATE HELPER
========================================= */
async function updateStatus(req, res, newStatus) {
  try {
    const app = await Application.findById(req.params.applicationId)
      .populate("jobId")
      .populate({
        path: "studentId",
        populate: { path: "userId", select: "name" }
      });

    if (!app) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (app.jobId.recruiterId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const previousStatus = app.status;
    app.status = newStatus;
    await app.save();

    const student = getStudentNotificationContext(app);
    if (student) {
      notifyApplicationStatus(
        student.userId,
        student.studentName,
        app.jobId?.title || "Job",
        app.jobId?.companyName || "Company",
        newStatus
      ).catch((err) => logNotificationError("application status", err));
    }

    await writeApplicationAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "APPLICATION_STATUS_UPDATED",
      app,
      changes: { from: previousStatus, to: newStatus }
    });

    res.json(app);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/* =========================================
   STATUS CONTROLLERS
========================================= */
exports.shortlistApplication = (req, res) =>
  updateStatus(req, res, "SHORTLISTED");

exports.sendAssessment = async (req, res) => {
  try {
    const normalizedLink = normalizeWebLink(req.body?.link);
    const requestedAssessmentDate = req.body?.scheduledAt ?? req.body?.assessmentDate ?? req.body?.date;
    const parsedAssessmentDate = requestedAssessmentDate
      ? parseDateInput(requestedAssessmentDate)
      : null;

    if (!normalizedLink) {
      return res.status(400).json({ message: "Assessment link is required" });
    }

    if (requestedAssessmentDate && !parsedAssessmentDate) {
      return res.status(400).json({ message: "Assessment date/time is invalid" });
    }

    const app = await Application.findById(req.params.applicationId)
      .populate("jobId")
      .populate({
        path: "studentId",
        populate: { path: "userId", select: "name" }
      });

    if (!app) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (app.jobId.recruiterId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const scheduledAt = parsedAssessmentDate || app?.assessment?.scheduledAt || new Date();
    const previousStatus = app.status;
    app.status = "ASSESSMENT_SENT";
    app.assessment = {
      ...app.assessment,
      link: normalizedLink,
      sentAt: new Date(),
      scheduledAt
    };

    await app.save();

    const student = getStudentNotificationContext(app);
    if (student) {
      notify({
        userId: student.userId,
        type: "ASSESSMENT_SENT",
        title: `Assessment Sent: ${app.jobId?.title || "Job"}`,
        message: "A new assessment has been shared for your application.",
        link: "/student/assessments",
        metadata: {
          applicationId: app._id,
          assessmentLink: normalizedLink,
          scheduledAt
        }
      }).catch((err) => logNotificationError("assessment notification", err));
    }

    await writeApplicationAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "ASSESSMENT_SENT",
      app,
      changes: {
        from: previousStatus,
        to: app.status,
        assessmentLink: normalizedLink,
        scheduledAt
      }
    });

    res.json(app);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateAssessmentResult = async (req, res) => {
  try {
    const { result, score } = req.body;
    const normalizedScore = String(score ?? "").trim();

    const app = await Application.findById(req.params.applicationId)
      .populate("jobId")
      .populate({
        path: "studentId",
        populate: { path: "userId", select: "name" }
      });
    if (!app) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (app.jobId.recruiterId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const isPassed = result === "PASS";
    const previousStatus = app.status;

    app.assessment = {
      ...app.assessment,
      score: normalizedScore,
      passed: isPassed
    };

    app.status = isPassed
      ? "ASSESSMENT_PASSED"
      : "ASSESSMENT_FAILED";

    await app.save();

    const student = getStudentNotificationContext(app);
    if (student) {
      notifyApplicationStatus(
        student.userId,
        student.studentName,
        app.jobId?.title || "Job",
        app.jobId?.companyName || "Company",
        app.status
      ).catch((err) => logNotificationError("assessment result notification", err));
    }

    await writeApplicationAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "ASSESSMENT_RESULT_UPDATED",
      app,
      changes: {
        from: previousStatus,
        to: app.status,
        score: normalizedScore,
        passed: isPassed
      }
    });

    res.json(app);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.scheduleInterview = async (req, res) => {
  try {
    const startDate = parseDateInput(req.body?.date);
    const mode = normalizeInterviewMode(req.body?.mode);
    const link = normalizeWebLink(req.body?.link);
    const providedEndDate = parseDateInput(req.body?.endDate);

    if (!startDate || !mode) {
      return res.status(400).json({ message: "Date and valid mode are required" });
    }

    const endDate = providedEndDate || new Date(startDate.getTime() + 30 * 60 * 1000);
    if (endDate.getTime() <= startDate.getTime()) {
      return res.status(400).json({ message: "End date must be after interview date" });
    }

    const app = await Application.findById(req.params.applicationId)
      .populate("jobId")
      .populate({
        path: "studentId",
        populate: { path: "userId", select: "name" }
      });

    if (!app) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (app.jobId.recruiterId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const previousStatus = app.status;
    app.status = "INTERVIEW_SCHEDULED";
    app.interview = {
      date: startDate,
      endDate,
      mode,
      link
    };
    app.interviewSlots = [];
    clearInterviewJoinRequest(app);

    await app.save();

    const student = getStudentNotificationContext(app);
    if (student) {
      notifyInterviewScheduled(
        student.userId,
        student.studentName,
        app.jobId?.title || "Job",
        startDate,
        mode,
        link
      ).catch((err) => logNotificationError("interview notification", err));
    }

    await writeApplicationAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "INTERVIEW_SCHEDULED",
      app,
      changes: {
        from: previousStatus,
        to: app.status,
        date: startDate,
        endDate,
        mode
      }
    });

    res.json(app);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.publishInterviewSlots = async (req, res) => {
  try {
    const slots = Array.isArray(req.body?.slots) ? req.body.slots : [];

    if (slots.length === 0) {
      return res.status(400).json({ message: "At least one interview slot is required" });
    }

    if (slots.length > 10) {
      return res.status(400).json({ message: "You can publish up to 10 interview slots at a time" });
    }

    const app = await Application.findById(req.params.applicationId)
      .populate("jobId")
      .populate({
        path: "studentId",
        populate: { path: "userId", select: "name" }
      });

    if (!app) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (app.jobId.recruiterId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (!["ASSESSMENT_PASSED", "INTERVIEW_SCHEDULED"].includes(app.status)) {
      return res.status(400).json({ message: "Interview slots can only be published for assessment-passed or interview-scheduled applications" });
    }

    const now = Date.now();
    const parsedSlots = [];

    for (let i = 0; i < slots.length; i += 1) {
      const rawSlot = slots[i] || {};
      const start = parseDateInput(rawSlot.start);
      const end = parseDateInput(rawSlot.end);
      const mode = normalizeInterviewMode(rawSlot.mode);
      const link = normalizeWebLink(rawSlot.link);

      if (!start || !end || !mode) {
        return res.status(400).json({ message: `Slot ${i + 1}: start, end, and mode are required` });
      }

      if (end.getTime() <= start.getTime()) {
        return res.status(400).json({ message: `Slot ${i + 1}: end must be after start` });
      }

      if (start.getTime() <= now) {
        return res.status(400).json({ message: `Slot ${i + 1}: start time must be in the future` });
      }

      parsedSlots.push({
        start,
        end,
        mode,
        link,
        bookedByStudent: false,
        bookedAt: null,
        bookedBy: null
      });
    }

    parsedSlots.sort((a, b) => a.start.getTime() - b.start.getTime());
    for (let i = 1; i < parsedSlots.length; i += 1) {
      const previous = parsedSlots[i - 1];
      const current = parsedSlots[i];
      if (current.start.getTime() < previous.end.getTime()) {
        return res.status(400).json({ message: "Interview slots cannot overlap" });
      }
    }

    const previousStatus = app.status;
    app.status = "ASSESSMENT_PASSED";
    app.interview = undefined;
    app.interviewSlots = parsedSlots;
    clearInterviewJoinRequest(app);
    await app.save();

    const student = getStudentNotificationContext(app);
    if (student) {
      notifyInterviewSlotsOpened(
        student.userId,
        student.studentName,
        app.jobId?.title || "Job",
        parsedSlots.length,
        app._id
      ).catch((err) => logNotificationError("interview slots opened notification", err));
    }

    await writeApplicationAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "INTERVIEW_SLOTS_PUBLISHED",
      app,
      entityType: "INTERVIEW_SLOT",
      changes: {
        from: previousStatus,
        to: app.status,
        slotCount: parsedSlots.length
      }
    });

    res.json(app);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.bookInterviewSlot = async (req, res) => {
  try {
    const slotId = String(req.body?.slotId || "").trim();
    if (!slotId) {
      return res.status(400).json({ message: "slotId is required" });
    }

    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const app = await Application.findOne({
      _id: req.params.applicationId,
      studentId: student._id
    })
      .populate("jobId")
      .populate({
        path: "studentId",
        populate: { path: "userId", select: "name" }
      });

    if (!app) {
      return res.status(404).json({ message: "Application not found" });
    }

    const slot = app.interviewSlots.id(slotId);
    if (!slot) {
      return res.status(404).json({ message: "Interview slot not found" });
    }

    if (slot.bookedByStudent) {
      return res.status(400).json({ message: "This slot is already booked" });
    }

    if (new Date(slot.start).getTime() <= Date.now()) {
      return res.status(400).json({ message: "This slot has already started or expired" });
    }

    const previousStatus = app.status;
    slot.bookedByStudent = true;
    slot.bookedAt = new Date();
    slot.bookedBy = student._id;
    app.status = "INTERVIEW_SCHEDULED";
    app.interview = {
      date: slot.start,
      endDate: slot.end,
      mode: slot.mode,
      link: slot.link
    };
    clearInterviewJoinRequest(app);

    await app.save();

    const studentContext = getStudentNotificationContext(app);
    if (studentContext) {
      notifyInterviewScheduled(
        studentContext.userId,
        studentContext.studentName,
        app.jobId?.title || "Job",
        slot.start,
        slot.mode,
        slot.link
      ).catch((err) => logNotificationError("interview booked notification", err));
    }

    const recruiter = await User.findById(app.jobId?.recruiterId).select("name");
    if (recruiter?._id) {
      notifyInterviewSlotBooked(
        recruiter._id.toString(),
        recruiter.name || "Recruiter",
        app.jobId?.title || "Job",
        studentContext?.studentName || "Candidate",
        slot.start,
        slot.mode,
        app._id
      ).catch((err) => logNotificationError("recruiter slot booked notification", err));
    }

    await writeApplicationAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "INTERVIEW_SLOT_BOOKED",
      app,
      entityType: "INTERVIEW_SLOT",
      entityId: slot._id,
      changes: {
        from: previousStatus,
        to: app.status,
        slotId: slot._id,
        slotStart: slot.start,
        slotEnd: slot.end,
        mode: slot.mode
      }
    });

    res.json(app);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.assignInterviewerToApplication = async (req, res) => {
  try {
    const interviewerUserId = String(req.body?.interviewerUserId || "").trim();
    if (!interviewerUserId || !mongoose.Types.ObjectId.isValid(interviewerUserId)) {
      return res.status(400).json({ message: "Valid interviewerUserId is required" });
    }

    const app = await Application.findById(req.params.applicationId)
      .populate("jobId")
      .populate({
        path: "studentId",
        populate: { path: "userId", select: "name email" }
      })
      .populate("interviewerAssignment.interviewerUserId", "name email");

    if (!app) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (String(app.jobId?.recruiterId || "") !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (app.status !== "INTERVIEW_SCHEDULED") {
      return res.status(400).json({ message: "Interviewer can only be unassigned from interview-scheduled applications" });
    }

    if (app.status !== "INTERVIEW_SCHEDULED" || !app.interview?.date) {
      return res.status(400).json({
        message: "Interviewer can only be assigned to an interview-scheduled application"
      });
    }

    if (hasInterviewerFeedback(app)) {
      return res.status(400).json({ message: "Feedback already submitted. Assignment cannot be changed." });
    }

    const interviewWindow = getInterviewWindow(app.interview);
    if (!interviewWindow) {
      return res.status(400).json({ message: "Interview date/end date is invalid" });
    }

    const interviewerProfile = await InterviewerProfile.findOne({
      userId: interviewerUserId,
      recruiterId: req.user.id,
      isActive: true
    }).populate("userId", "name email role isActive");

    if (!interviewerProfile || !interviewerProfile.userId) {
      return res.status(404).json({ message: "Interviewer not found for this recruiter" });
    }

    if (
      interviewerProfile.userId.role !== "interviewer" ||
      !interviewerProfile.userId.isActive
    ) {
      return res.status(400).json({ message: "Interviewer account is inactive" });
    }

    const interviewerApps = await Application.find({
      _id: { $ne: app._id },
      status: "INTERVIEW_SCHEDULED",
      "interviewerAssignment.interviewerUserId": interviewerProfile.userId._id
    }).select("interview");

    for (const existing of interviewerApps) {
      const existingWindow = getInterviewWindow(existing.interview);
      if (!existingWindow) continue;

      const overlaps =
        interviewWindow.start.getTime() < existingWindow.end.getTime() &&
        existingWindow.start.getTime() < interviewWindow.end.getTime();
      if (overlaps) {
        return res.status(400).json({
          message: "Interviewer has an overlapping assigned interview"
        });
      }
    }

    const previousInterviewerId = String(
      app?.interviewerAssignment?.interviewerUserId?._id ||
      app?.interviewerAssignment?.interviewerUserId ||
      ""
    );
    const now = new Date();
    app.interviewerAssignment = {
      interviewerUserId: interviewerProfile.userId._id,
      assignedBy: req.user.id,
      assignedAt: now
    };
    clearInterviewJoinRequest(app);
    await app.save();

    notify({
      userId: interviewerProfile.userId._id.toString(),
      type: "INTERVIEWER_ASSIGNED",
      title: `Interview Assigned: ${app.jobId?.title || "Interview"}`,
      message: `You have a new interview scheduled on ${new Date(app.interview.date).toLocaleString()}.`,
      link: "/interviewer",
      metadata: {
        applicationId: app._id,
        interviewDate: app.interview.date,
        companyName: app.jobId?.companyName || ""
      },
      sendMail: false
    }).catch((err) => logNotificationError("interviewer assignment", err));

    await writeApplicationAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "INTERVIEWER_ASSIGNED",
      app,
      entityType: "INTERVIEWER_ASSIGNMENT",
      entityId: app._id,
      changes: {
        from: previousInterviewerId || null,
        to: interviewerProfile.userId._id.toString(),
        assignedAt: now
      }
    });

    const refreshed = await Application.findById(app._id)
      .populate({
        path: "studentId",
        populate: { path: "userId", select: "name email" }
      })
      .populate("jobId")
      .populate("interviewerAssignment.interviewerUserId", "name email");

    res.json(refreshed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.unassignInterviewerFromApplication = async (req, res) => {
  try {
    const app = await Application.findById(req.params.applicationId)
      .populate("jobId")
      .populate("interviewerAssignment.interviewerUserId", "name email");

    if (!app) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (String(app.jobId?.recruiterId || "") !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (hasInterviewerFeedback(app)) {
      return res.status(400).json({ message: "Feedback already submitted. Interviewer cannot be unassigned." });
    }

    const assignedInterviewer = app?.interviewerAssignment?.interviewerUserId;
    const assignedInterviewerId = String(
      assignedInterviewer?._id || app?.interviewerAssignment?.interviewerUserId || ""
    );

    if (!assignedInterviewerId) {
      return res.status(400).json({ message: "No interviewer assigned to this application" });
    }

    app.interviewerAssignment = {
      interviewerUserId: null,
      assignedBy: null,
      assignedAt: null
    };
    clearInterviewJoinRequest(app);
    await app.save();

    notify({
      userId: assignedInterviewerId,
      type: "INTERVIEWER_ASSIGNED",
      title: `Interview Unassigned: ${app.jobId?.title || "Interview"}`,
      message: "You were unassigned from an interview.",
      link: "/interviewer",
      metadata: {
        applicationId: app._id
      },
      sendMail: false
    }).catch((err) => logNotificationError("interviewer unassignment", err));

    await writeApplicationAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "INTERVIEWER_UNASSIGNED",
      app,
      entityType: "INTERVIEWER_ASSIGNMENT",
      entityId: app._id,
      changes: {
        from: assignedInterviewerId,
        to: null
      }
    });

    res.json(app);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.selectCandidate = (req, res) =>
  updateStatus(req, res, "SELECTED");

exports.rejectCandidate = (req, res) =>
  updateStatus(req, res, "REJECTED");

/* =========================================
   GENERATE OFFER (CORRECT VERSION)
========================================= */
exports.generateOffer = async (req, res) => {
  try {
    const salary = String(req.body?.salary || "").trim();
    const joiningDate = String(req.body?.joiningDate || "").trim();
    const location = String(req.body?.location || "").trim();

    if (!salary || !joiningDate || !location) {
      return res.status(400).json({ message: "Salary, joining date, and location are required" });
    }

    const parsedJoiningDate = new Date(joiningDate);
    if (Number.isNaN(parsedJoiningDate.getTime())) {
      return res.status(400).json({ message: "Joining date must be a valid date" });
    }

    const app = await Application.findById(req.params.applicationId)
      .populate({
        path: "studentId",
        populate: { path: "userId", select: "name email" }
      })
      .populate("jobId");

    if (!app) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (app.jobId.recruiterId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (app.status !== "SELECTED") {
      return res.status(400).json({ message: "Only SELECTED candidates can receive offer" });
    }

    const offerDir = path.join(__dirname, "../offers");
    if (!fs.existsSync(offerDir)) {
      fs.mkdirSync(offerDir, { recursive: true });
    }

    const fileName = `offer_${app._id}.pdf`;
    const filePath = path.join(offerDir, fileName);

    app.offer = {
      salary,
      joiningDate: parsedJoiningDate,
      location,
      generatedAt: new Date(),
      status: "PENDING",
      pdfPath: `/offers/${fileName}`
    };

    await generatePDF(app, filePath);
    await app.save();

    const studentUser = app.studentId?.userId;
    const studentUserId = studentUser?._id ? studentUser._id.toString() : null;
    if (studentUserId) {
      notifyOfferReceived(
        studentUserId,
        app.jobId?.title || "Job",
        app.jobId?.companyName || "Company"
      ).catch((err) => logNotificationError("offer notification", err));
    }

    await writeApplicationAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "OFFER_GENERATED",
      app,
      changes: {
        salary,
        joiningDate: parsedJoiningDate,
        location
      }
    });

    res.json(app.offer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* =========================================
   RESPOND TO OFFER (SECURE)
========================================= */
exports.respondToOffer = async (req, res) => {
  try {
    const { decision } = req.body;

    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const app = await Application.findOne({
      _id: req.params.applicationId,
      studentId: student._id
    })
      .populate("jobId");

    if (!app || !app.offer) {
      return res.status(404).json({ message: "Offer not found" });
    }

    const validDecisions = ["ACCEPTED", "DECLINED"];
    if (!validDecisions.includes(decision)) {
      return res.status(400).json({ message: "Decision must be ACCEPTED or DECLINED" });
    }

    const previousStatus = app.offer.status;
    app.offer.status = decision;
    await app.save();

    await writeApplicationAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "OFFER_RESPONSE_UPDATED",
      app,
      changes: {
        from: previousStatus,
        to: decision
      }
    });

    res.json(app.offer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMyInterviews = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.id });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const interviews = await Application.find({
      studentId: student._id,
      status: "INTERVIEW_SCHEDULED"
    })
      .populate("jobId", "title companyName companyLogo")
      .select("jobId interview status createdAt interviewerAssignment interviewerFeedback interviewJoinRequest");

    const payload = interviews.map((app) => {
      const access = buildStudentInterviewAccess(app.interview);
      const baseInterview = app?.interview ? { ...app.interview.toObject?.() } : {};
      const isOnline = String(baseInterview?.mode || "").trim().toLowerCase() === "online";
      const interview = !isOnline || access.canAccessRoom
        ? baseInterview
        : { ...baseInterview, link: "" };

      return {
        _id: app._id,
        jobId: app.jobId,
        interview,
        status: app.status,
        createdAt: app.createdAt,
        interviewerAssignment: app.interviewerAssignment,
        interviewerFeedback: app.interviewerFeedback,
        joinRequest: getInterviewJoinRequest(app),
        ...access
      };
    });

    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMyInterviewRoom = async (req, res) => {
  try {
    const accessResult = await validateInterviewRoomAccess({
      applicationId: req.params.applicationId,
      userId: req.user.id,
      role: "student",
      requireStudentApproval: false
    });

    if (!accessResult.ok) {
      const payload = { message: accessResult.message };
      if (accessResult.access) {
        payload.countdownSeconds = accessResult.access.countdownSeconds;
        payload.canAccessRoom = accessResult.access.canAccessRoom;
        payload.canJoin = accessResult.access.canJoin;
        payload.accessWindowStart = accessResult.access.accessWindowStart;
        payload.accessWindowEnd = accessResult.access.accessWindowEnd;
      }
      payload.joinRequest = accessResult.joinRequest || buildEmptyInterviewJoinRequest();
      return res.status(accessResult.statusCode).json(payload);
    }

    const app = accessResult.application;

    return res.json({
      applicationId: app._id,
      roomName: accessResult.roomName,
      participant: {
        userId: req.user.id,
        role: accessResult.participantRole,
        name: accessResult.participantName
      },
      job: {
        _id: app.jobId?._id || null,
        title: app.jobId?.title || "Interview",
        companyName: app.jobId?.companyName || ""
      },
      interview: {
        date: app.interview?.date || null,
        endDate: app.interview?.endDate || null,
        mode: app.interview?.mode || "",
        accessWindowStart: accessResult.access.accessWindowStart,
        accessWindowEnd: accessResult.access.accessWindowEnd
      },
      access: accessResult.access,
      joinRequest: accessResult.joinRequest || buildEmptyInterviewJoinRequest(),
      socket: {
        url: getBackendOrigin(req),
        path: "/socket.io"
      }
    });
  } catch (err) {
    console.error("getMyInterviewRoom error:", err);
    return res.status(500).json({ message: "Failed to load interview room" });
  }
};

exports.requestMyInterviewJoinApproval = async (req, res) => {
  try {
    const accessResult = await validateInterviewRoomAccess({
      applicationId: req.params.applicationId,
      userId: req.user.id,
      role: "student",
      requireStudentApproval: false
    });

    if (!accessResult.ok) {
      const payload = {
        message: accessResult.message,
        joinRequest: accessResult.joinRequest || buildEmptyInterviewJoinRequest()
      };
      if (accessResult.access) {
        payload.countdownSeconds = accessResult.access.countdownSeconds;
        payload.canAccessRoom = accessResult.access.canAccessRoom;
        payload.canJoin = accessResult.access.canJoin;
        payload.accessWindowStart = accessResult.access.accessWindowStart;
        payload.accessWindowEnd = accessResult.access.accessWindowEnd;
      }
      return res.status(accessResult.statusCode).json(payload);
    }

    const app = accessResult.application;
    const interviewerUserId = String(
      app?.interviewerAssignment?.interviewerUserId?._id ||
      app?.interviewerAssignment?.interviewerUserId ||
      ""
    );

    if (!interviewerUserId) {
      return res.status(400).json({ message: "No interviewer is assigned yet for this interview" });
    }

    const existingRequest = getInterviewJoinRequest(app);
    if (existingRequest.status === "APPROVED") {
      return res.json({
        message: "Join request already approved",
        joinRequest: existingRequest
      });
    }

    if (existingRequest.status === "PENDING") {
      return res.status(202).json({
        message: "Join request is already pending interviewer approval",
        joinRequest: existingRequest
      });
    }

    const now = new Date();
    app.interviewJoinRequest = {
      status: "PENDING",
      requestedBy: req.user.id,
      requestedAt: now,
      decisionBy: null,
      decidedAt: null,
      rejectReason: ""
    };
    await app.save();

    notify({
      userId: interviewerUserId,
      type: "INTERVIEW_JOIN_REQUESTED",
      title: `Join Request: ${app?.jobId?.title || "Interview"}`,
      message: "Student requested to join the virtual interview room.",
      link: `/interviewer/interviews/${app._id}/room`,
      metadata: {
        applicationId: app._id,
        requestedAt: now
      },
      sendMail: false
    }).catch((notifyErr) => logNotificationError("interview join request", notifyErr));

    return res.status(202).json({
      message: "Join request sent to interviewer",
      joinRequest: getInterviewJoinRequest(app)
    });
  } catch (err) {
    console.error("requestMyInterviewJoinApproval error:", err);
    return res.status(500).json({ message: "Failed to send join request" });
  }
};

exports.getMyInterviewJoinApprovalStatus = async (req, res) => {
  try {
    const accessResult = await validateInterviewRoomAccess({
      applicationId: req.params.applicationId,
      userId: req.user.id,
      role: "student",
      requireStudentApproval: false
    });

    if (!accessResult.ok) {
      const payload = {
        message: accessResult.message,
        joinRequest: accessResult.joinRequest || buildEmptyInterviewJoinRequest()
      };
      if (accessResult.access) {
        payload.countdownSeconds = accessResult.access.countdownSeconds;
        payload.canAccessRoom = accessResult.access.canAccessRoom;
        payload.canJoin = accessResult.access.canJoin;
        payload.accessWindowStart = accessResult.access.accessWindowStart;
        payload.accessWindowEnd = accessResult.access.accessWindowEnd;
      }
      return res.status(accessResult.statusCode).json(payload);
    }

    return res.json({
      joinRequest: accessResult.joinRequest || buildEmptyInterviewJoinRequest(),
      canJoin: accessResult.access?.canJoin || false,
      accessWindowStart: accessResult.access?.accessWindowStart || null,
      accessWindowEnd: accessResult.access?.accessWindowEnd || null
    });
  } catch (err) {
    console.error("getMyInterviewJoinApprovalStatus error:", err);
    return res.status(500).json({ message: "Failed to get join approval status" });
  }
};

exports.getMyInterviewSlots = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.id });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const appsWithSlots = await Application.find({
      studentId: student._id,
      status: { $in: ["ASSESSMENT_PASSED", "INTERVIEW_SCHEDULED"] },
      interviewSlots: { $exists: true, $not: { $size: 0 } }
    })
      .populate("jobId", "title companyName companyLogo")
      .select("jobId interviewSlots status interview createdAt");

    const now = Date.now();
    const payload = appsWithSlots
      .map((app) => {
        const availableSlots = (app.interviewSlots || [])
          .filter((slot) => !slot.bookedByStudent && new Date(slot.start).getTime() > now)
          .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

        return {
          _id: app._id,
          jobId: app.jobId,
          status: app.status,
          interview: app.interview,
          interviewSlots: availableSlots
        };
      })
      .filter((app) => app.interviewSlots.length > 0);

    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMyAssessments = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.id });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const assessments = await Application.find({
      studentId: student._id,
      status: {
        $in: ["ASSESSMENT_SENT", "ASSESSMENT_PASSED", "ASSESSMENT_FAILED"]
      }
    })
      .populate("jobId", "title companyName companyLogo")
      .select("jobId assessment status createdAt");

    const nowTs = Date.now();
    const payload = (assessments || [])
      .map((app) => {
        const scheduledAt = app?.assessment?.scheduledAt || app?.createdAt || null;
        const scheduledTs = scheduledAt ? new Date(scheduledAt).getTime() : NaN;
        const completed = ["ASSESSMENT_PASSED", "ASSESSMENT_FAILED"].includes(app.status);
        const pastByTime = Number.isFinite(scheduledTs) ? scheduledTs < nowTs : false;

        let uiStatus = "UPCOMING";
        if (completed) {
          uiStatus = "COMPLETED";
        } else if (pastByTime) {
          uiStatus = "MISSED";
        }

        return {
          _id: app._id,
          jobId: app.jobId,
          assessment: app.assessment,
          status: app.status,
          createdAt: app.createdAt,
          assessmentDateTime: scheduledAt,
          uiStatus,
          isUpcoming: uiStatus === "UPCOMING",
          isPast: uiStatus !== "UPCOMING",
          canStartAssessment: uiStatus === "UPCOMING" && Boolean(app?.assessment?.link),
          canViewResult: uiStatus === "COMPLETED"
        };
      })
      .sort((a, b) => {
        const aTs = a.assessmentDateTime ? new Date(a.assessmentDateTime).getTime() : 0;
        const bTs = b.assessmentDateTime ? new Date(b.assessmentDateTime).getTime() : 0;
        return aTs - bTs;
      });

    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
