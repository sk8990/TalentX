const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "APPLICATION_STATUS",
        "INTERVIEW_SCHEDULED",
        "INTERVIEW_SLOT_OPENED",
        "INTERVIEW_SLOT_BOOKED",
        "ASSESSMENT_SENT",
        "OFFER_RECEIVED",
        "RECRUITER_APPROVED",
        "JOB_POSTED",
        "TICKET_ANSWERED",
        "INTERVIEWER_ASSIGNED",
        "INTERVIEWER_FEEDBACK_SUBMITTED",
        "INTERVIEWER_CREATED",
        "GENERAL",
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String },
    isRead: { type: Boolean, default: false },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Auto-delete old notifications after 30 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model("Notification", notificationSchema);
