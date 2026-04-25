const mongoose = require("mongoose");
const { DOCUMENT_STATUSES } = require("../constants/onboarding");

const onboardingDocumentSchema = new mongoose.Schema(
  {
    instanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OnboardingInstance",
      required: true
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null
    },
    stepId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    stepKey: { type: String, required: true, trim: true },
    submissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OnboardingStepSubmission",
      default: null
    },
    submissionVersion: { type: Number, default: 0, min: 0 },
    documentType: {
      key: { type: String, required: true, trim: true },
      label: { type: String, required: true, trim: true }
    },
    storage: {
      fileName: { type: String, required: true },
      originalName: { type: String, required: true },
      mimeType: { type: String, required: true },
      size: { type: Number, required: true, min: 1 },
      url: { type: String, required: true }
    },
    status: {
      type: String,
      enum: DOCUMENT_STATUSES,
      default: "uploaded"
    },
    verification: {
      status: {
        type: String,
        enum: ["not_uploaded", "ai_verifying", "verified", "name_mismatch", "failed", "manual_review"],
        default: "not_uploaded"
      },
      expectedName: { type: String, default: "" },
      detectedName: { type: String, default: "" },
      confidence: { type: Number, default: 0, min: 0, max: 1 },
      message: { type: String, default: "" },
      verifiedAt: { type: Date, default: null }
    },
    isLatest: { type: Boolean, default: true },
    rejectionReason: { type: String, default: "" },
    reviewedAt: { type: Date, default: null },
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  {
    timestamps: true,
    collection: "documents"
  }
);

onboardingDocumentSchema.index(
  { instanceId: 1, stepKey: 1, "documentType.key": 1, isLatest: 1 },
  { partialFilterExpression: { isLatest: true } }
);

module.exports = mongoose.model("OnboardingDocument", onboardingDocumentSchema);
