const mongoose = require("mongoose");
const {
  STEP_STATUSES,
  ONBOARDING_STATUSES,
  STEP_TYPES
} = require("../constants/onboarding");

const instanceStepSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    order: { type: Number, required: true, min: 1 },
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: Object.values(STEP_TYPES),
      required: true
    },
    templateStepId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    status: {
      type: String,
      enum: STEP_STATUSES,
      default: "locked"
    },
    startedAt: { type: Date, default: null },
    submittedAt: { type: Date, default: null },
    reviewedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: "" },
    reviewNotes: { type: String, default: "" },
    lastSubmissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OnboardingStepSubmission",
      default: null
    },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { _id: true }
);

const onboardingOfficeLocationSchema = new mongoose.Schema(
  {
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    country: { type: String, default: "" },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null }
  },
  { _id: false }
);

const onboardingInstanceSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null
    },
    companyName: { type: String, required: true, trim: true },
    companyLogo: { type: String, default: "" },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OnboardingTemplate",
      required: true
    },
    currentStep: { type: Number, default: 1, min: 1 },
    currentStepKey: { type: String, default: "" },
    status: {
      type: String,
      enum: ONBOARDING_STATUSES,
      default: "not_started"
    },
    onboardingStartedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    joiningDetails: {
      joiningDate: { type: Date, default: null },
      reportingTime: { type: String, default: "9:00 AM" },
      officeLocation: {
        type: onboardingOfficeLocationSchema,
        default: () => ({})
      }
    },
    // Phase 4.5: Onboarding deadline for SLA tracking
    deadline: { type: Date, default: null },
    steps: {
      type: [instanceStepSchema],
      default: []
    },
    summary: {
      completedSteps: { type: Number, default: 0 },
      totalSteps: { type: Number, default: 0 },
      recruiterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      }
    }
  },
  {
    timestamps: true,
    collection: "onboardingInstances"
  }
);

onboardingInstanceSchema.index({ studentId: 1, applicationId: 1 }, { unique: true });
onboardingInstanceSchema.index({ userId: 1, status: 1 });
onboardingInstanceSchema.index({ jobId: 1, status: 1 });

module.exports = mongoose.model("OnboardingInstance", onboardingInstanceSchema);
