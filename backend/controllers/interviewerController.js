const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const Application = require("../models/Application");
const InterviewerProfile = require("../models/InterviewerProfile");
const User = require("../models/User");
const { sendEmail } = require("../services/emailService");
const { notify } = require("../services/notificationService");
const { writeAuditLog } = require("../services/auditService");
const { validateInterviewRoomAccess } = require("../services/interviewRoomService");
const { buildInterviewAccess, getInterviewWindow } = require("../utils/interviewAccess");

const RECOMMENDATION_ENUM = ["STRONG_YES", "YES", "MAYBE", "NO", "STRONG_NO"];

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function normalizeExpertise(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  return [];
}

function getFrontendBaseUrl() {
  return String(process.env.FRONTEND_URL || "http://localhost:5173")
    .trim()
    .replace(/\/+$/, "");
}

function getInterviewerPanelLink() {
  return `${getFrontendBaseUrl()}/interviewer`;
}

function getBackendOrigin(req) {
  const explicitOrigin = String(process.env.BACKEND_PUBLIC_URL || "").trim();
  if (explicitOrigin) {
    return explicitOrigin.replace(/\/+$/, "");
  }

  return `${req.protocol}://${req.get("host")}`;
}

function buildInterviewerCredentialEmail({
  recruiterName,
  interviewerName,
  interviewerCode,
  temporaryPassword
}) {
  const panelLink = getInterviewerPanelLink();
  const safeRecruiterName = recruiterName || "Recruiter";
  const safeInterviewerName = interviewerName || "Interviewer";

  return {
    subject: "TalentX Interviewer Account Credentials",
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 620px; margin: 0 auto; padding: 24px;">
        <h2 style="margin: 0 0 12px;">Welcome to TalentX Interview Panel</h2>
        <p>Hello <strong>${safeInterviewerName}</strong>,</p>
        <p>${safeRecruiterName} created your interviewer account.</p>
        <p>Use the following credentials to log in:</p>
        <ul>
          <li><strong>Interviewer ID:</strong> ${interviewerCode}</li>
          <li><strong>Temporary Password:</strong> ${temporaryPassword}</li>
          <li><strong>Panel Link:</strong> <a href="${panelLink}">${panelLink}</a></li>
        </ul>
        <p>You must change your password after your first login.</p>
      </div>
    `
  };
}

async function generateUniqueInterviewerCode() {
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const code = `INT-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    // eslint-disable-next-line no-await-in-loop
    const exists = await InterviewerProfile.findOne({ interviewerCode: code }).select("_id");
    if (!exists) return code;
  }

  throw new Error("Failed to generate interviewer code");
}

function generateTemporaryPassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%^&*";
  const all = `${upper}${lower}${digits}${symbols}`;

  while (true) {
    let temp = "";
    for (let i = 0; i < 12; i += 1) {
      temp += all[Math.floor(Math.random() * all.length)];
    }

    if (
      /[A-Z]/.test(temp) &&
      /[a-z]/.test(temp) &&
      /[0-9]/.test(temp) &&
      /[!@#$%^&*]/.test(temp)
    ) {
      return temp;
    }
  }
}

function categorizeInterview(app, nowTs) {
  const hasFeedback = Boolean(app?.interviewerFeedback?.submittedAt);
  if (hasFeedback) return "completed";

  const window = getInterviewWindow(app?.interview);
  if (!window) return "pending";

  if (window.end.getTime() <= nowTs) {
    return "pending";
  }

  return "upcoming";
}

function sanitizeRatings(ratingsInput) {
  const ratings = ratingsInput || {};
  const parsed = {
    communication: Number(ratings.communication),
    technical: Number(ratings.technical),
    problemSolving: Number(ratings.problemSolving),
    cultureFit: Number(ratings.cultureFit)
  };

  const keys = Object.keys(parsed);
  for (const key of keys) {
    const value = parsed[key];
    if (!Number.isFinite(value) || value < 1 || value > 5) {
      return null;
    }
  }

  return parsed;
}

function toInterviewerPayload(profile, statsMap) {
  const user = profile.userId;
  const stats = statsMap.get(String(user?._id || "")) || {
    totalAssigned: 0,
    upcomingAssigned: 0,
    pendingFeedback: 0
  };

  return {
    _id: profile._id,
    interviewerCode: profile.interviewerCode,
    recruiterId: profile.recruiterId,
    isActive: Boolean(profile.isActive && user?.isActive),
    phone: profile.phone || "",
    expertise: Array.isArray(profile.expertise) ? profile.expertise : [],
    notes: profile.notes || "",
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    user: user
      ? {
          _id: user._id,
          name: user.name || "",
          email: user.email || "",
          isActive: Boolean(user.isActive),
          mustChangePassword: Boolean(user.mustChangePassword)
        }
      : null,
    stats
  };
}

async function loadStatsByInterviewerUserIds(userIds) {
  const map = new Map();
  if (!userIds.length) return map;

  const apps = await Application.find({
    "interviewerAssignment.interviewerUserId": { $in: userIds }
  }).select("interviewerAssignment interview interviewerFeedback status");

  const nowTs = Date.now();
  for (const app of apps) {
    const interviewerUserId = String(app?.interviewerAssignment?.interviewerUserId || "");
    if (!interviewerUserId) continue;

    const existing = map.get(interviewerUserId) || {
      totalAssigned: 0,
      upcomingAssigned: 0,
      pendingFeedback: 0
    };

    existing.totalAssigned += 1;
    const bucket = categorizeInterview(app, nowTs);
    if (bucket === "upcoming") {
      existing.upcomingAssigned += 1;
    }
    if (bucket === "pending") {
      existing.pendingFeedback += 1;
    }

    map.set(interviewerUserId, existing);
  }

  return map;
}

exports.getRecruiterInterviewers = async (req, res) => {
  try {
    const profiles = await InterviewerProfile.find({ recruiterId: req.user.id })
      .populate("userId", "name email isActive mustChangePassword")
      .sort({ createdAt: -1 });

    const userIds = profiles
      .map((profile) => profile.userId?._id)
      .filter(Boolean);
    const statsMap = await loadStatsByInterviewerUserIds(userIds);

    res.json(profiles.map((profile) => toInterviewerPayload(profile, statsMap)));
  } catch (err) {
    console.error("getRecruiterInterviewers error:", err);
    res.status(500).json({ message: "Failed to load interviewers" });
  }
};

exports.createRecruiterInterviewer = async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = normalizeEmail(req.body?.email);
    const phone = String(req.body?.phone || "").trim();
    const notes = String(req.body?.notes || "").trim();
    const expertise = normalizeExpertise(req.body?.expertise);

    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required" });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }

    const existingUser = await User.findOne({ email }).select("_id");
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    const interviewerCode = await generateUniqueInterviewerCode();
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    const interviewerUser = await User.create({
      name,
      email,
      password: passwordHash,
      role: "interviewer",
      mustChangePassword: true
    });

    const profile = await InterviewerProfile.create({
      userId: interviewerUser._id,
      recruiterId: req.user.id,
      interviewerCode,
      phone,
      expertise,
      notes,
      isActive: true
    });

    const recruiter = await User.findById(req.user.id).select("name");
    const emailPayload = buildInterviewerCredentialEmail({
      recruiterName: recruiter?.name || "Recruiter",
      interviewerName: name,
      interviewerCode,
      temporaryPassword
    });

    const emailResult = await sendEmail({
      to: email,
      subject: emailPayload.subject,
      html: emailPayload.html
    });

    await writeAuditLog({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "INTERVIEWER_CREATED",
      entityType: "INTERVIEWER",
      entityId: profile._id,
      metadata: {
        interviewerUserId: interviewerUser._id,
        interviewerCode
      }
    });

    notify({
      userId: req.user.id,
      type: "INTERVIEWER_CREATED",
      title: `Interviewer Added: ${name}`,
      message: `Credentials have ${emailResult ? "been sent" : "not been sent"} to ${email}.`,
      link: "/recruiter/interviewers",
      metadata: {
        interviewerCode,
        interviewerProfileId: profile._id,
        emailSent: Boolean(emailResult)
      },
      sendMail: false
    }).catch((notifyErr) => {
      console.error("[NOTIFY] interviewer creation notification failed:", notifyErr.message);
    });

    const created = await InterviewerProfile.findById(profile._id).populate(
      "userId",
      "name email isActive mustChangePassword"
    );

    res.status(201).json({
      interviewer: toInterviewerPayload(created, new Map()),
      emailSent: Boolean(emailResult)
    });
  } catch (err) {
    console.error("createRecruiterInterviewer error:", err);
    res.status(500).json({ message: "Failed to create interviewer" });
  }
};

exports.updateRecruiterInterviewer = async (req, res) => {
  try {
    const profile = await InterviewerProfile.findOne({
      _id: req.params.id,
      recruiterId: req.user.id
    }).populate("userId");

    if (!profile || !profile.userId) {
      return res.status(404).json({ message: "Interviewer not found" });
    }

    const nextName = String(req.body?.name || profile.userId.name || "").trim();
    const nextEmail = normalizeEmail(req.body?.email || profile.userId.email);
    const nextPhone = String(req.body?.phone ?? profile.phone ?? "").trim();
    const nextNotes = String(req.body?.notes ?? profile.notes ?? "").trim();
    const nextExpertise = req.body?.expertise !== undefined
      ? normalizeExpertise(req.body.expertise)
      : profile.expertise;
    const requestedActive = req.body?.isActive;

    if (!nextName || !nextEmail) {
      return res.status(400).json({ message: "Name and email are required" });
    }

    if (!isValidEmail(nextEmail)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }

    if (nextEmail !== profile.userId.email) {
      const conflict = await User.findOne({ email: nextEmail, _id: { $ne: profile.userId._id } }).select("_id");
      if (conflict) {
        return res.status(400).json({ message: "Another user already uses this email" });
      }
    }

    profile.userId.name = nextName;
    profile.userId.email = nextEmail;

    if (typeof requestedActive === "boolean") {
      if (!requestedActive) {
        const upcomingAssignments = await Application.countDocuments({
          status: "INTERVIEW_SCHEDULED",
          "interviewerAssignment.interviewerUserId": profile.userId._id,
          "interview.date": { $gt: new Date() }
        });

        if (upcomingAssignments > 0) {
          return res.status(400).json({
            message: "Cannot deactivate interviewer with upcoming assigned interviews",
            upcomingAssignments
          });
        }
      }
      profile.isActive = requestedActive;
      profile.userId.isActive = requestedActive;
    }

    profile.phone = nextPhone;
    profile.notes = nextNotes;
    profile.expertise = nextExpertise;

    await profile.userId.save();
    await profile.save();

    await writeAuditLog({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "INTERVIEWER_UPDATED",
      entityType: "INTERVIEWER",
      entityId: profile._id,
      metadata: {
        interviewerUserId: profile.userId._id
      }
    });

    const updated = await InterviewerProfile.findById(profile._id).populate(
      "userId",
      "name email isActive mustChangePassword"
    );
    const statsMap = await loadStatsByInterviewerUserIds([updated.userId._id]);
    res.json(toInterviewerPayload(updated, statsMap));
  } catch (err) {
    console.error("updateRecruiterInterviewer error:", err);
    res.status(500).json({ message: "Failed to update interviewer" });
  }
};

exports.deactivateRecruiterInterviewer = async (req, res) => {
  try {
    const profile = await InterviewerProfile.findOne({
      _id: req.params.id,
      recruiterId: req.user.id
    }).populate("userId", "name email isActive");

    if (!profile || !profile.userId) {
      return res.status(404).json({ message: "Interviewer not found" });
    }

    const upcomingAssignments = await Application.countDocuments({
      status: "INTERVIEW_SCHEDULED",
      "interviewerAssignment.interviewerUserId": profile.userId._id,
      "interview.date": { $gt: new Date() }
    });

    if (upcomingAssignments > 0) {
      return res.status(400).json({
        message: "Cannot deactivate interviewer with upcoming assigned interviews",
        upcomingAssignments
      });
    }

    profile.isActive = false;
    profile.userId.isActive = false;
    await profile.userId.save();
    await profile.save();

    await writeAuditLog({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "INTERVIEWER_DEACTIVATED",
      entityType: "INTERVIEWER",
      entityId: profile._id,
      metadata: {
        interviewerUserId: profile.userId._id
      }
    });

    res.json({ message: "Interviewer deactivated successfully" });
  } catch (err) {
    console.error("deactivateRecruiterInterviewer error:", err);
    res.status(500).json({ message: "Failed to deactivate interviewer" });
  }
};

exports.resendRecruiterInterviewerCredentials = async (req, res) => {
  try {
    const profile = await InterviewerProfile.findOne({
      _id: req.params.id,
      recruiterId: req.user.id
    }).populate("userId", "name email isActive");

    if (!profile || !profile.userId) {
      return res.status(404).json({ message: "Interviewer not found" });
    }

    if (!profile.isActive || !profile.userId.isActive) {
      return res.status(400).json({ message: "Interviewer is inactive. Activate before resending credentials." });
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    profile.userId.password = passwordHash;
    profile.userId.mustChangePassword = true;
    await profile.userId.save();

    const recruiter = await User.findById(req.user.id).select("name");
    const emailPayload = buildInterviewerCredentialEmail({
      recruiterName: recruiter?.name || "Recruiter",
      interviewerName: profile.userId.name,
      interviewerCode: profile.interviewerCode,
      temporaryPassword
    });

    const emailResult = await sendEmail({
      to: profile.userId.email,
      subject: emailPayload.subject,
      html: emailPayload.html
    });

    await writeAuditLog({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "INTERVIEWER_CREDENTIALS_RESENT",
      entityType: "INTERVIEWER",
      entityId: profile._id,
      metadata: {
        interviewerUserId: profile.userId._id,
        emailSent: Boolean(emailResult)
      }
    });

    res.json({
      message: emailResult
        ? "Credentials sent successfully"
        : "Credentials updated but email sending failed"
    });
  } catch (err) {
    console.error("resendRecruiterInterviewerCredentials error:", err);
    res.status(500).json({ message: "Failed to resend interviewer credentials" });
  }
};

exports.getMyAssignedInterviews = async (req, res) => {
  try {
    const requestedBucket = String(req.query?.bucket || "").trim().toLowerCase();
    const supportedBuckets = new Set(["upcoming", "pending", "completed"]);
    const bucketFilter = supportedBuckets.has(requestedBucket) ? requestedBucket : "";
    const nowTs = Date.now();

    const apps = await Application.find({
      status: "INTERVIEW_SCHEDULED",
      "interviewerAssignment.interviewerUserId": req.user.id
    })
      .populate("jobId", "title companyName companyLogo recruiterId")
      .populate({
        path: "studentId",
        select: "userId branch cgpa year",
        populate: { path: "userId", select: "name email" }
      })
      .populate("interviewerFeedback.submittedBy", "name email")
      .select("jobId studentId interview interviewerAssignment interviewerFeedback status createdAt updatedAt")
      .sort({ "interview.date": 1 });

    const payload = apps
      .map((app) => {
        const bucket = categorizeInterview(app, nowTs);
        if (bucketFilter && bucket !== bucketFilter) return null;
        const access = buildInterviewAccess(app.interview);

        return {
          _id: app._id,
          jobId: app.jobId,
          studentId: app.studentId,
          interview: app.interview,
          status: app.status,
          interviewerAssignment: app.interviewerAssignment,
          interviewerFeedback: app.interviewerFeedback,
          bucket,
          createdAt: app.createdAt,
          updatedAt: app.updatedAt,
          ...access
        };
      })
      .filter(Boolean);

    res.json(payload);
  } catch (err) {
    console.error("getMyAssignedInterviews error:", err);
    res.status(500).json({ message: "Failed to fetch assigned interviews" });
  }
};

exports.getMyInterviewRoomAccess = async (req, res) => {
  try {
    const accessResult = await validateInterviewRoomAccess({
      applicationId: req.params.applicationId,
      userId: req.user.id,
      role: "interviewer"
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
      student: {
        _id: app.studentId?._id || null,
        name: app.studentId?.userId?.name || "Candidate",
        email: app.studentId?.userId?.email || ""
      },
      interview: {
        date: app.interview?.date || null,
        endDate: app.interview?.endDate || null,
        mode: app.interview?.mode || "",
        accessWindowStart: accessResult.access.accessWindowStart,
        accessWindowEnd: accessResult.access.accessWindowEnd
      },
      access: accessResult.access,
      socket: {
        url: getBackendOrigin(req),
        path: "/socket.io"
      }
    });
  } catch (err) {
    console.error("getMyInterviewRoomAccess error:", err);
    return res.status(500).json({ message: "Failed to load interview room" });
  }
};

exports.submitMyInterviewFeedback = async (req, res) => {
  try {
    const recommendation = String(req.body?.recommendation || "").trim().toUpperCase();
    const notes = String(req.body?.notes || "").trim();
    const ratings = sanitizeRatings(req.body?.ratings);

    if (!RECOMMENDATION_ENUM.includes(recommendation)) {
      return res.status(400).json({ message: "Valid recommendation is required" });
    }

    if (!ratings) {
      return res.status(400).json({ message: "All rating values must be between 1 and 5" });
    }

    const app = await Application.findById(req.params.applicationId)
      .populate("jobId", "title companyName recruiterId")
      .populate({
        path: "studentId",
        select: "userId",
        populate: { path: "userId", select: "name email" }
      });

    if (!app) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (app.status !== "INTERVIEW_SCHEDULED" || !app.interview?.date) {
      return res.status(400).json({ message: "Interview feedback can only be submitted for scheduled interviews" });
    }

    const assignedInterviewerUserId = String(app?.interviewerAssignment?.interviewerUserId || "");
    if (!assignedInterviewerUserId || assignedInterviewerUserId !== String(req.user.id)) {
      return res.status(403).json({ message: "You are not assigned to this interview" });
    }

    if (app?.interviewerFeedback?.submittedAt) {
      return res.status(400).json({ message: "Feedback already submitted for this interview" });
    }

    const window = getInterviewWindow(app.interview);
    if (!window) {
      return res.status(400).json({ message: "Interview schedule is invalid" });
    }

    if (Date.now() < window.end.getTime()) {
      return res.status(400).json({ message: "Feedback can be submitted only after interview ends" });
    }

    app.interviewerFeedback = {
      submittedBy: req.user.id,
      submittedAt: new Date(),
      recommendation,
      ratings,
      notes
    };
    await app.save();

    const recruiterUserId = app?.jobId?.recruiterId ? String(app.jobId.recruiterId) : "";
    if (recruiterUserId) {
      notify({
        userId: recruiterUserId,
        type: "INTERVIEWER_FEEDBACK_SUBMITTED",
        title: `Evaluation Submitted: ${app.jobId?.title || "Interview"}`,
        message: "An interviewer submitted candidate evaluation.",
        link: "/recruiter/applications",
        metadata: {
          applicationId: app._id,
          recommendation
        },
        sendMail: false
      }).catch((notifyErr) => {
        console.error("[NOTIFY] interviewer feedback notify failed:", notifyErr.message);
      });
    }

    await writeAuditLog({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "INTERVIEWER_FEEDBACK_SUBMITTED",
      entityType: "INTERVIEWER_FEEDBACK",
      entityId: app._id,
      applicationId: app._id,
      jobId: app?.jobId?._id || null,
      metadata: {
        recommendation
      }
    });

    res.json(app.interviewerFeedback);
  } catch (err) {
    console.error("submitMyInterviewFeedback error:", err);
    res.status(500).json({ message: "Failed to submit feedback" });
  }
};
