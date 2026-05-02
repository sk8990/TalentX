const path = require("path");
const mongoose = require("mongoose");
const Student = require("../models/Student");
const Application = require("../models/Application");
const Job = require("../models/Job");
const SupportTicket = require("../models/SupportTicket");
const OnboardingDocument = require("../models/Document");
const OnboardingInstance = require("../models/OnboardingInstance");
const {
  resolveRootUploadFile,
  resolveOnboardingDocumentFile
} = require("../helpers/secureFilePath");

function oid(id) {
  if (!id) return null;
  try {
    return new mongoose.Types.ObjectId(id);
  } catch {
    return null;
  }
}

function mimeForPath(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif"
  };
  return map[ext] || "application/octet-stream";
}

function rootPublicUrl(filename) {
  return `/uploads/${filename}`;
}

function onboardingPublicUrl(filename) {
  return `/uploads/onboarding-documents/${filename}`;
}

async function isReferencedAnywhere(fullUrl) {
  const [s, a, t, j, d] = await Promise.all([
    Student.exists({ resumeUrl: fullUrl }),
    Application.exists({ resumeUrl: fullUrl }),
    SupportTicket.exists({ screenshotPath: fullUrl }),
    Job.exists({ companyLogo: fullUrl }),
    OnboardingDocument.exists({ "storage.url": fullUrl })
  ]);
  return Boolean(s || a || t || j || d);
}

async function canAccessRootUpload(req, filename) {
  const fullUrl = rootPublicUrl(filename);
  const user = req.user;
  const userOid = oid(user.id);

  if (user.role === "super_admin") {
    return isReferencedAnywhere(fullUrl);
  }

  const ticket = await SupportTicket.findOne({ screenshotPath: fullUrl });
  if (ticket) {
    if (user.role === "admin" || user.role === "super_admin") return true;
    if (user.role === "student") {
      const student = await Student.findOne({ userId: userOid });
      if (student && ticket.studentId && ticket.studentId.equals(student._id)) return true;
      return false;
    }
    if (user.role === "recruiter" && ticket.recruiterId && ticket.recruiterId.equals(userOid)) {
      return true;
    }
    return false;
  }

  const ownerStudent = await Student.findOne({ resumeUrl: fullUrl });
  if (ownerStudent) {
    if (ownerStudent.userId.equals(userOid)) return true;
    if (user.role === "college_admin") {
      const cid = oid(user.collegeId);
      if (cid && ownerStudent.collegeId && ownerStudent.collegeId.equals(cid)) return true;
    }
    if (user.role === "recruiter") {
      const application = await Application.findOne({ resumeUrl: fullUrl }).populate({
        path: "jobId",
        select: "recruiterId"
      });
      if (application?.jobId?.recruiterId?.equals(userOid)) return true;
    }
    return false;
  }

  const application = await Application.findOne({ resumeUrl: fullUrl })
    .populate({ path: "jobId", select: "recruiterId" })
    .populate({ path: "studentId", select: "collegeId userId" });

  if (application) {
    if (application.studentId?.userId?.equals(userOid)) return true;
    if (user.role === "recruiter" && application.jobId?.recruiterId?.equals(userOid)) return true;
    if (user.role === "college_admin") {
      const cid = oid(user.collegeId);
      if (
        cid &&
        application.studentId?.collegeId &&
        application.studentId.collegeId.equals(cid)
      ) {
        return true;
      }
    }
    return false;
  }

  const jobsWithLogo = await Job.find({ companyLogo: fullUrl }).select("recruiterId").lean();
  if (jobsWithLogo.length > 0) {
    if (user.role === "recruiter" && jobsWithLogo.some((j) => oid(j.recruiterId)?.equals(userOid))) {
      return true;
    }
    return false;
  }

  return false;
}

async function canAccessOnboardingDoc(req, filename) {
  const fullUrl = onboardingPublicUrl(filename);
  const user = req.user;
  const userOid = oid(user.id);

  if (user.role === "super_admin") {
    return OnboardingDocument.exists({ "storage.url": fullUrl });
  }

  const doc = await OnboardingDocument.findOne({ "storage.url": fullUrl }).populate({
    path: "studentId",
    select: "userId collegeId"
  });

  if (!doc) return false;

  if (doc.studentId?.userId?.equals(userOid)) return true;

  if (user.role === "college_admin") {
    const cid = oid(user.collegeId);
    if (cid && doc.studentId?.collegeId && doc.studentId.collegeId.equals(cid)) return true;
  }

  if (user.role === "recruiter") {
    const instance = await OnboardingInstance.findById(doc.instanceId).select("jobId");
    if (!instance?.jobId) return false;
    const job = await Job.findById(instance.jobId).select("recruiterId");
    if (job?.recruiterId?.equals(userOid)) return true;
  }

  return false;
}

function sendLocalFile(res, absolutePath, downloadName) {
  const contentType = mimeForPath(absolutePath);
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(downloadName)}`);
  return res.sendFile(absolutePath);
}

exports.downloadRootUpload = async (req, res) => {
  try {
    const filename = req.params.filename;
    const absolutePath = resolveRootUploadFile(filename);
    if (!absolutePath) {
      return res.status(404).json({ message: "File not found" });
    }

    const allowed = await canAccessRootUpload(req, filename);
    if (!allowed) {
      return res.status(403).json({ message: "Access denied" });
    }

    return sendLocalFile(res, absolutePath, filename);
  } catch (err) {
    console.error("downloadRootUpload error:", err);
    return res.status(500).json({ message: "Unable to download file" });
  }
};

exports.downloadOnboardingDocument = async (req, res) => {
  try {
    const filename = req.params.filename;
    const absolutePath = resolveOnboardingDocumentFile(filename);
    if (!absolutePath) {
      return res.status(404).json({ message: "File not found" });
    }

    const allowed = await canAccessOnboardingDoc(req, filename);
    if (!allowed) {
      return res.status(403).json({ message: "Access denied" });
    }

    const fullUrl = onboardingPublicUrl(filename);
    const doc = await OnboardingDocument.findOne({ "storage.url": fullUrl }).select("storage.originalName").lean();
    const displayName = doc?.storage?.originalName || filename;

    return sendLocalFile(res, absolutePath, displayName);
  } catch (err) {
    console.error("downloadOnboardingDocument error:", err);
    return res.status(500).json({ message: "Unable to download file" });
  }
};
