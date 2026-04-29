const mongoose = require("mongoose");

const PackageUsageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
      required: true,
      index: true,
    },
    usageType: {
      type: String,
      required: true,
      index: true,
      // Examples: job_creation, interview_scheduling, offer_letter_generation,
      // onboarding_panel_access, candidate_management, recruiter_management, audit_usage
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    limitCount: {
      type: Number,
      required: true,
    },
    resetCycle: {
      type: String,
      enum: ["monthly", "yearly", "never"],
      default: "never",
    },
    lastResetAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

PackageUsageSchema.index({ userId: 1, usageType: 1 });

module.exports = mongoose.model("PackageUsage", PackageUsageSchema);
