const mongoose = require("mongoose");

const interviewerProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },
    recruiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    interviewerCode: {
      type: String,
      required: true,
      unique: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    phone: {
      type: String,
      default: ""
    },
    expertise: {
      type: [String],
      default: []
    },
    notes: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

interviewerProfileSchema.index({ recruiterId: 1, isActive: 1 });

module.exports = mongoose.model("InterviewerProfile", interviewerProfileSchema);
