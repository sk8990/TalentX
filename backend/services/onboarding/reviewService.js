const mongoose = require("mongoose");
const Job = require("../../models/Job");
const OnboardingInstance = require("../../models/OnboardingInstance");
const OnboardingStepSubmission = require("../../models/OnboardingStepSubmission");
const OnboardingDocument = require("../../models/Document");
const { STEP_TYPES } = require("../../constants/onboarding");
const {
  toObjectIdString,
  unlockNextStep,
  recalculateInstanceState
} = require("./helpers");
const { sendEmail, emailTemplates } = require("../emailService");

async function assertRecruiterOwnsInstance(instanceId, recruiterId) {
  const instance = await OnboardingInstance.findById(instanceId)
    .populate("jobId", "title companyName companyLogo recruiterId")
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "name email" }
    });
  if (!instance) {
    const error = new Error("Onboarding instance not found");
    error.statusCode = 404;
    throw error;
  }

  if (toObjectIdString(instance.jobId?.recruiterId) !== toObjectIdString(recruiterId)) {
    const error = new Error("Not authorized to review this onboarding submission");
    error.statusCode = 403;
    throw error;
  }

  return instance;
}

async function findLatestDocumentSubmission(instance, stepId) {
  const step = instance.steps.id(stepId);
  if (!step) {
    const error = new Error("Onboarding step not found");
    error.statusCode = 404;
    throw error;
  }

  if (step.type !== STEP_TYPES.DOCUMENT_COLLECTION) {
    const error = new Error("Only document submission steps can be reviewed");
    error.statusCode = 400;
    throw error;
  }

  const submission = await OnboardingStepSubmission.findOne({
    instanceId: instance._id,
    stepId
  }).sort({ version: -1, updatedAt: -1 });

  if (!submission) {
    const error = new Error("No step submission found to review");
    error.statusCode = 404;
    throw error;
  }

  return { step, submission };
}

async function approveDocumentStep({ recruiterId, instanceId, stepId, reviewNotes }) {
  const instance = await assertRecruiterOwnsInstance(instanceId, recruiterId);
  const { step, submission } = await findLatestDocumentSubmission(instance, stepId);

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      submission.status = "approved";
      submission.reviewedAt = new Date();
      submission.reviewerId = recruiterId;
      submission.reviewNotes = String(reviewNotes || "").trim();
      submission.rejectionReason = "";
      submission.history = [
        ...(submission.history || []),
        {
          status: "approved",
          changedAt: new Date(),
          changedBy: recruiterId,
          note: submission.reviewNotes || "Documents approved"
        }
      ];
      await submission.save({ session });

      await OnboardingDocument.updateMany(
        { _id: { $in: submission.documentIds || [] } },
        {
          $set: {
            status: "approved",
            reviewedAt: new Date(),
            reviewerId: recruiterId,
            rejectionReason: ""
          }
        },
        { session }
      );

      step.status = "approved";
      step.reviewedAt = new Date();
      step.reviewNotes = submission.reviewNotes || "";
      step.rejectionReason = "";
      step.lastSubmissionId = submission._id;
      unlockNextStep(instance, step._id);
      recalculateInstanceState(instance);
      await instance.save({ session });
    });
  } finally {
    await session.endSession();
  }

  // Phase 3.4: Send approval email
  const studentEmail = instance.studentId?.userId?.email;
  const studentName = instance.studentId?.userId?.name || "Student";
  const companyName = instance.companyName || instance.jobId?.companyName || "TalentX";

  if (studentEmail) {
    sendEmail({
      to: studentEmail,
      ...emailTemplates.onboardingDocumentsApproved(studentName, companyName)
    }).catch((err) => console.error("Failed to send approval email:", err));
  }

  return instance;
}

async function rejectDocumentStep({ recruiterId, instanceId, stepId, rejectionReason }) {
  const reason = String(rejectionReason || "").trim();
  if (!reason) {
    const error = new Error("Rejection reason is required");
    error.statusCode = 400;
    throw error;
  }

  const instance = await assertRecruiterOwnsInstance(instanceId, recruiterId);
  const { step, submission } = await findLatestDocumentSubmission(instance, stepId);

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      submission.status = "rejected";
      submission.reviewedAt = new Date();
      submission.reviewerId = recruiterId;
      submission.rejectionReason = reason;
      submission.history = [
        ...(submission.history || []),
        {
          status: "rejected",
          changedAt: new Date(),
          changedBy: recruiterId,
          note: reason
        }
      ];
      await submission.save({ session });

      await OnboardingDocument.updateMany(
        { _id: { $in: submission.documentIds || [] } },
        {
          $set: {
            status: "rejected",
            reviewedAt: new Date(),
            reviewerId: recruiterId,
            rejectionReason: reason
          }
        },
        { session }
      );

      step.status = "rejected";
      step.reviewedAt = new Date();
      step.reviewNotes = "";
      step.rejectionReason = reason;
      step.lastSubmissionId = submission._id;
      recalculateInstanceState(instance);
      await instance.save({ session });
    });
  } finally {
    await session.endSession();
  }

  // Phase 3.4: Send rejection email
  const studentEmail = instance.studentId?.userId?.email;
  const studentName = instance.studentId?.userId?.name || "Student";
  const companyName = instance.companyName || instance.jobId?.companyName || "TalentX";

  if (studentEmail) {
    sendEmail({
      to: studentEmail,
      ...emailTemplates.onboardingDocumentsRejected(studentName, companyName, reason)
    }).catch((err) => console.error("Failed to send rejection email:", err));
  }

  return instance;
}

async function getRecruiterReviewQueue(recruiterId) {
  const jobs = await Job.find({ recruiterId }).select("_id title companyName companyLogo");
  if (!jobs.length) {
    return { mode: "review", queue: [] };
  }

  const jobIds = jobs.map((job) => job._id);
  const jobMap = new Map(jobs.map((job) => [toObjectIdString(job._id), job]));

  const instances = await OnboardingInstance.find({
    jobId: { $in: jobIds },
    "steps.status": { $in: ["under_review"] }
  })
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "name email" }
    })
    .sort({ updatedAt: -1 });

  const queue = [];

  for (const instance of instances) {
    const documentStep = instance.steps.find((step) => step.type === STEP_TYPES.DOCUMENT_COLLECTION && step.status === "under_review");
    if (!documentStep) continue;

    const submission = await OnboardingStepSubmission.findOne({
      instanceId: instance._id,
      stepId: documentStep._id
    }).sort({ version: -1, updatedAt: -1 });

    if (!submission) continue;

    const documents = await OnboardingDocument.find({
      instanceId: instance._id,
      submissionId: submission._id
    }).sort({ updatedAt: -1 });

    const job = jobMap.get(toObjectIdString(instance.jobId)) || null;

    queue.push({
      instanceId: instance._id,
      stepId: documentStep._id,
      companyName: instance.companyName,
      companyLogo: instance.companyLogo || job?.companyLogo || "",
      jobRole: job?.title || "Offer",
      student: {
        name: instance.studentId?.userId?.name || "Student",
        email: instance.studentId?.userId?.email || ""
      },
      submittedAt: submission.submittedAt,
      status: submission.status,
      reviewNotes: submission.reviewNotes || "",
      formData: submission.payload?.formData || {},
      documents: documents.map((document) => ({
        id: document._id,
        label: document.documentType.label,
        originalName: document.storage.originalName,
        url: document.storage.url,
        status: document.status
      }))
    });
  }

  return { mode: "review", queue };
}

async function getOnboardingStats(recruiterId) {
  const jobs = await Job.find({ recruiterId }).select("_id");
  if (!jobs.length) {
    return { total: 0, inProgress: 0, completed: 0, pendingReview: 0, notStarted: 0 };
  }

  const jobIds = jobs.map((job) => job._id);

  const [total, inProgress, completed, pendingReview, notStarted] = await Promise.all([
    OnboardingInstance.countDocuments({ jobId: { $in: jobIds } }),
    OnboardingInstance.countDocuments({ jobId: { $in: jobIds }, status: "in_progress" }),
    OnboardingInstance.countDocuments({ jobId: { $in: jobIds }, status: { $in: ["completed", "ready_for_day_one"] } }),
    OnboardingInstance.countDocuments({ jobId: { $in: jobIds }, "steps.status": "under_review" }),
    OnboardingInstance.countDocuments({ jobId: { $in: jobIds }, status: "not_started" })
  ]);

  return { total, inProgress, completed, pendingReview, notStarted };
}

module.exports = {
  approveDocumentStep,
  rejectDocumentStep,
  getRecruiterReviewQueue,
  getOnboardingStats
};
