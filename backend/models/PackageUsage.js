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

PackageUsageSchema.index({ userId: 1, usageType: 1 }, { unique: true });
// NOTE: If this index is being added to an existing collection that already
// has duplicate (userId, usageType) pairs, the index creation will fail.
// Run the deduplication query before deploying:
//
//   db.packageusages.aggregate([
//     { $group: { _id: { userId: "$userId", usageType: "$usageType" },
//                 ids: { $push: "$_id" }, count: { $sum: 1 } } },
//     { $match: { count: { $gt: 1 } } }
//   ]).forEach(group => {
//     group.ids.slice(1).forEach(id => db.packageusages.deleteOne({ _id: id }));
//   });

module.exports = mongoose.model("PackageUsage", PackageUsageSchema);
