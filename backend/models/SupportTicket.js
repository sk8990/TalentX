const mongoose = require("mongoose");

const supportTicketSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student"
    },
    recruiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    requesterRole: {
      type: String,
      enum: ["student", "recruiter"],
      required: true
    },
    question: {
      type: String,
      required: true
    },
    aiResponse: String,
    screenshotPath: String,
    adminResponse: String,
    status: {
      type: String,
      enum: ["OPEN", "ANSWERED", "CLOSED"],
      default: "OPEN"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("SupportTicket", supportTicketSchema);
