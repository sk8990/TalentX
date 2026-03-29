const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    actorRole: {
      type: String,
      enum: ["student", "recruiter", "admin", "system", "interviewer"],
      default: "system"
    },
    action: {
      type: String,
      required: true,
      index: true
    },
    entityType: {
      type: String,
      enum: ["APPLICATION", "INTERVIEW_SLOT", "BULK_ACTION", "INTERVIEWER", "INTERVIEWER_ASSIGNMENT", "INTERVIEWER_FEEDBACK"],
      required: true
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      default: null,
      index: true
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      default: null
    },
    changes: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("AuditLog", auditLogSchema);
