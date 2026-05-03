const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },

    studentType: {
      type: String,
      enum: ["college_student", "open_student"],
      default: "open_student"
    },

    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      default: null
    },

    collegeName: {
      type: String,
      default: null
    },

    collegeVerificationStatus: {
      type: String,
      enum: ["not_required", "pending", "approved", "rejected"],
      default: "not_required"
    },

    isCollegeVerified: {
      type: Boolean,
      default: false
    },

    accessLevel: {
      type: String,
      enum: ["limited", "full"],
      default: "limited"
    },

    isDisabled: {
      type: Boolean,
      default: false
    },

    branch: {
      type: String,
      enum: ["CS", "IT", "ENTC", "MECH", "CIVIL"],
      default: null
    },

    year: {
      type: String,
      default: null
    },

    cgpa: {
      type: Number,
      default: 0,
      min: 0,
      max: 10
    },

    skills: {
      type: [String],
      default: []
    },

    resumeUrl: {
      type: String
    },

    resumeSummary: {
      type: String,
      default: ""
    },

    resumeParsedAt: {
      type: Date,
      default: null
    },

    preferences: {
      alertsEnabled: {
        type: Boolean,
        default: true
      },
      preferredRoles: {
        type: [String],
        default: []
      },
      preferredLocations: {
        type: [String],
        default: []
      },
      minCtc: {
        type: Number,
        default: 0,
        min: 0
      }
    }
  },
  { timestamps: true }
);

studentSchema.index({ collegeId: 1 });
studentSchema.index({ studentType: 1 });
studentSchema.index({ collegeVerificationStatus: 1 });
studentSchema.index({ accessLevel: 1 });

module.exports = mongoose.model("Student", studentSchema);
