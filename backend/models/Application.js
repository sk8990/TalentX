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
      score: Number,
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
        communication: { type: Number, min: 1, max: 5, default: null },
        technical: { type: Number, min: 1, max: 5, default: null },
        problemSolving: { type: Number, min: 1, max: 5, default: null },
        cultureFit: { type: Number, min: 1, max: 5, default: null }
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
