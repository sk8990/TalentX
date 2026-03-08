const mongoose = require("mongoose");

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
      mode: String,
      link: String
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
}


  },
  { timestamps: true }
);

module.exports = mongoose.model("Application", applicationSchema);
