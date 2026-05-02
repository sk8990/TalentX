const mongoose = require("mongoose");

const studentUsageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    month: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format"]
    },
    jobApplicationsUsed: {
      type: Number,
      default: 0
    },
    aiInterviewsUsed: {
      type: Number,
      default: 0
    },
    skillTestsUsed: {
      type: Number,
      default: 0
    },
    resumesCreated: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

studentUsageSchema.index({ userId: 1, month: 1 }, { unique: true });
studentUsageSchema.index({ userId: 1 });
studentUsageSchema.index({ month: 1 });

module.exports = mongoose.model("StudentUsage", studentUsageSchema);
