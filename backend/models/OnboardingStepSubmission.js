const mongoose = require("mongoose");
const { STEP_STATUSES, STEP_TYPES } = require("../constants/onboarding");

const submissionHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: STEP_STATUSES,
      required: true
    },
    note: { type: String, default: "" },
    changedAt: { type: Date, default: Date.now },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  { _id: false }
);

const onboardingStepSubmissionSchema = new mongoose.Schema(
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
    stepType: {
      type: String,
      enum: Object.values(STEP_TYPES),
      required: true
    },
    version: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: STEP_STATUSES,
      default: "submitted"
    },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    documentIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "OnboardingDocument"
        }
      ],
      default: []
    },
    submittedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date, default: null },
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    rejectionReason: { type: String, default: "" },
    reviewNotes: { type: String, default: "" },
    history: {
      type: [submissionHistorySchema],
      default: []
    }
  },
  {
    timestamps: true,
    collection: "onboardingStepSubmissions"
  }
);

onboardingStepSubmissionSchema.index({ instanceId: 1, stepKey: 1, version: 1 }, { unique: true });
onboardingStepSubmissionSchema.index({ stepId: 1, status: 1 });

module.exports = mongoose.model("OnboardingStepSubmission", onboardingStepSubmissionSchema);
