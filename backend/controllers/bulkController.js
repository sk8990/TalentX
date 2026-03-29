const Application = require("../models/Application");
const mongoose = require("mongoose");
const { writeAuditLog } = require("../services/auditService");
const { notify, notifyApplicationStatus } = require("../services/notificationService");

const BULK_RULES = {
  SHORTLISTED: {
    allowedFrom: ["APPLIED"]
  },
  ASSESSMENT_SENT: {
    allowedFrom: ["SHORTLISTED"],
    requiresAssessmentLink: true
  },
  REJECTED: {
    allowedFrom: ["APPLIED", "SHORTLISTED", "ASSESSMENT_SENT", "ASSESSMENT_PASSED", "INTERVIEW_SCHEDULED"]
  },
  SELECTED: {
    allowedFrom: ["INTERVIEW_SCHEDULED"]
  }
};

function normalizeWebLink(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

function getStudentNotificationContext(application) {
  const studentUser = application?.studentId?.userId;
  if (!studentUser) return null;

  if (typeof studentUser === "object") {
    if (!studentUser._id) return null;
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

function getInvalidTransitions(applications, newStatus) {
  const allowedFrom = BULK_RULES[newStatus].allowedFrom;

  return applications
    .filter((app) => !allowedFrom.includes(app.status))
    .map((app) => ({
      applicationId: app._id,
      currentStatus: app.status
    }));
}

// Sprint 3: Bulk update application statuses with transition validation + audit
exports.bulkUpdateStatus = async (req, res) => {
  try {
    const { applicationIds, newStatus, assessmentLink } = req.body;

    if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
      return res.status(400).json({ message: "Please select at least one application" });
    }

    if (applicationIds.length > 100) {
      return res.status(400).json({ message: "Bulk action limit is 100 applications per request" });
    }

    if (!BULK_RULES[newStatus]) {
      return res.status(400).json({
        message: `Invalid status: ${newStatus}. Allowed: ${Object.keys(BULK_RULES).join(", ")}`
      });
    }

    const normalizedIds = [...new Set(applicationIds.map((id) => String(id || "").trim()))];
    if (normalizedIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
      return res.status(400).json({ message: "One or more application IDs are invalid" });
    }

    let normalizedAssessmentLink = "";
    if (BULK_RULES[newStatus].requiresAssessmentLink) {
      normalizedAssessmentLink = normalizeWebLink(assessmentLink);
      if (!normalizedAssessmentLink) {
        return res.status(400).json({ message: "assessmentLink is required for ASSESSMENT_SENT bulk updates" });
      }
    }

    const applications = await Application.find({
      _id: { $in: normalizedIds }
    })
      .populate("jobId")
      .populate({
        path: "studentId",
        populate: { path: "userId", select: "name" }
      });

    if (applications.length !== normalizedIds.length) {
      return res.status(404).json({ message: "One or more applications were not found" });
    }

    const unauthorized = applications.find(
      (app) => app.jobId?.recruiterId?.toString() !== req.user.id
    );

    if (unauthorized) {
      return res.status(403).json({ message: "Not authorized for one or more applications" });
    }

    const invalidTransitions = getInvalidTransitions(applications, newStatus);
    if (invalidTransitions.length) {
      return res.status(400).json({
        message: "Bulk action contains invalid status transitions",
        invalidTransitions
      });
    }

    const now = new Date();
    for (const app of applications) {
      const previousStatus = app.status;
      app.status = newStatus;

      if (newStatus === "ASSESSMENT_SENT") {
        app.assessment = {
          ...app.assessment,
          link: normalizedAssessmentLink
        };
      }

      await app.save();

      const student = getStudentNotificationContext(app);
      if (student) {
        if (newStatus === "ASSESSMENT_SENT") {
          notify({
            userId: student.userId,
            type: "ASSESSMENT_SENT",
            title: `Assessment Sent: ${app.jobId?.title || "Job"}`,
            message: "A new assessment has been shared for your application.",
            link: "/student/assessments",
            metadata: {
              applicationId: app._id,
              assessmentLink: normalizedAssessmentLink
            }
          }).catch((err) => console.error("[NOTIFY] bulk assessment failed:", err.message));
        } else {
          notifyApplicationStatus(
            student.userId,
            student.studentName,
            app.jobId?.title || "Job",
            app.jobId?.companyName || "Company",
            newStatus
          ).catch((err) => console.error("[NOTIFY] bulk status failed:", err.message));
        }
      }

      await writeAuditLog({
        actorId: req.user.id,
        actorRole: req.user.role,
        action: "BULK_APPLICATION_STATUS_UPDATED",
        entityType: "APPLICATION",
        entityId: app._id,
        applicationId: app._id,
        jobId: app.jobId?._id || null,
        changes: {
          from: previousStatus,
          to: newStatus
        },
        metadata: {
          bulkRequestAt: now,
          assessmentLink: normalizedAssessmentLink || undefined
        }
      });
    }

    await writeAuditLog({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "BULK_STATUS_ACTION_EXECUTED",
      entityType: "BULK_ACTION",
      entityId: new mongoose.Types.ObjectId(),
      changes: {
        targetStatus: newStatus,
        totalApplications: applications.length
      },
      metadata: {
        applicationIds: applications.map((app) => app._id),
        assessmentLink: normalizedAssessmentLink || undefined
      }
    });

    res.json({
      message: `${applications.length} application(s) updated to ${newStatus}`,
      modifiedCount: applications.length
    });
  } catch (err) {
    console.error("Bulk update error:", err);
    res.status(500).json({ message: err.message });
  }
};
