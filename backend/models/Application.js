const mongoose = require("mongoose");

const interviewSlotSchema = new mongoose.Schema(
  {
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    mode: {
      type: String,
      enum: ["Online", "Offline"],
      required: true
    },
    link: { type: String, default: "" },
    bookedByStudent: { type: Boolean, default: false },
    bookedAt: { type: Date, default: null },
    bookedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null
    }
  },
  { _id: true }
);

const applicationSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true
    },
    resumeUrl: { type: String, required: true },
    coverNote: String,

    status: {
      type: String,
      enum: [
        "APPLIED",
        "SHORTLISTED",
        "ASSESSMENT_SENT",
        "ASSESSMENT_PASSED",
        "ASSESSMENT_FAILED",
        "INTERVIEW_SCHEDULED",
        "SELECTED",
        "REJECTED"
      ],
      default: "APPLIED"
    },

    assessment: {
      link: String,
      sentAt: { type: Date, default: null },
      scheduledAt: { type: Date, default: null },
      score: String,
      passed: Boolean
    },

    interview: {
      date: Date,
      endDate: Date,
      mode: String,
      link: String
    },

    interviewSlots: {
      type: [interviewSlotSchema],
      default: []
    },

    offer: {
      salary: String,
      joiningDate: Date,
      location: String,
      generatedAt: Date,
      status: {
        type: String,
        enum: ["PENDING", "ACCEPTED", "DECLINED"],
        default: "PENDING"
      },
      pdfPath: String
    },

    interviewerAssignment: {
      interviewerUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      },
      assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      },
      assignedAt: {
        type: Date,
        default: null
      }
    },

    interviewReschedule: {
      count: {
        type: Number,
        default: 0
      },
      lastReason: {
        type: String,
        enum: ["STUDENT_NO_SHOW", "INTERVIEWER_UNAVAILABLE", "OTHER"],
        default: null
      },
      lastNotes: {
        type: String,
        default: ""
      },
      lastRescheduledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      },
      lastRescheduledAt: {
        type: Date,
        default: null
      },
      previousDate: {
        type: Date,
        default: null
      },
      previousEndDate: {
        type: Date,
        default: null
      }
    },

    interviewJoinRequest: {
      status: {
        type: String,
        enum: ["NONE", "PENDING", "APPROVED", "REJECTED"],
        default: "NONE"
      },
      requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      },
      requestedAt: {
        type: Date,
        default: null
      },
      decisionBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      },
      decidedAt: {
        type: Date,
        default: null
      },
      rejectReason: {
        type: String,
        default: ""
      }
    },

    interviewerFeedback: {
      submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      },
      submittedAt: {
        type: Date,
        default: null
      },
      recommendation: {
        type: String,
        enum: ["STRONG_YES", "YES", "MAYBE", "NO", "STRONG_NO"],
        default: null
      },
      ratings: {
        communication: { type: String, enum: ["1", "2", "3", "4", "5"], default: null },
        technical: { type: String, enum: ["1", "2", "3", "4", "5"], default: null },
        problemSolving: { type: String, enum: ["1", "2", "3", "4", "5"], default: null },
        cultureFit: { type: String, enum: ["1", "2", "3", "4", "5"], default: null }
      },
      notes: {
        type: String,
        default: ""
      }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Application", applicationSchema);
