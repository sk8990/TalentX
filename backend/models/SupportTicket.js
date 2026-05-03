const mongoose = require("mongoose");

const supportTicketSchema = new mongoose.Schema(
  {
    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
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
      enum: ["student", "recruiter", "college_admin", "university_admin", "admin", "super_admin"],
      required: true
    },
    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      default: null
    },
    assignedToRole: {
      type: String,
      enum: ["college_admin", "super_admin"],
      default: "super_admin"
    },
    assignedCollegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      default: null
    },
    question: {
      type: String,
      required: true
    },
    aiResponse: String,
    screenshotPath: String,
    adminResponse: String,
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      default: "MEDIUM"
    },
    status: {
      type: String,
      enum: ["OPEN", "ANSWERED", "CLOSED"],
      default: "OPEN"
    },
    messages: {
      type: [
        {
          senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
          },
          senderRole: {
            type: String,
            enum: ["student", "recruiter", "college_admin", "university_admin", "admin", "super_admin"],
            required: true
          },
          message: {
            type: String,
            required: true
          },
          createdAt: {
            type: Date,
            default: Date.now
          }
        }
      ],
      default: []
    }
  },
  { timestamps: true }
);

supportTicketSchema.index({ requesterId: 1, createdAt: -1 });
supportTicketSchema.index({ studentId: 1, createdAt: -1 });
supportTicketSchema.index({ recruiterId: 1, createdAt: -1 });
supportTicketSchema.index({ assignedToRole: 1, assignedCollegeId: 1, createdAt: -1 });

module.exports = mongoose.model("SupportTicket", supportTicketSchema);
