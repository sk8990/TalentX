const mongoose = require("mongoose");

const USER_ROLES = [
  "student",
  "recruiter",
  "admin",
  "university_admin",
  "college_admin",
  "interviewer",
  "super_admin"
];

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true, trim: true, lowercase: true },
    password: String,
    role: {
      type: String,
      enum: USER_ROLES,
      required: true
    },
    mustChangePassword: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    },
    disabledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    disabledAt: {
      type: Date,
      default: null
    },
    disabledReason: {
      type: String,
      default: ""
    },

    recruiterApprovalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended"],
      default: function () {
        return this.role === "recruiter" ? "pending" : undefined;
      }
    },

    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      default: null
    },

    companyName: {
      type: String,
      default: ""
    },
    companyWebsite: {
      type: String,
      default: ""
    },
    companyEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    approvedAt: {
      type: Date,
      default: null
    },

    resetPasswordToken: String,
    resetPasswordExpire: Date,

    // Pending email change — set when a student requests an email update.
    // The change is not applied until confirmed (future verification step).
    // See POST /api/student/settings/request-email-change.
    pendingEmail: {
      type: String,
      default: null,
      trim: true,
      lowercase: true
    }
  },
  { timestamps: true }
);

userSchema.index({ role: 1 });
userSchema.index({ collegeId: 1 });
userSchema.index({ recruiterApprovalStatus: 1 });
userSchema.index({ isActive: 1 });

// Virtuals: isApproved and isRecruiterApproved derived from recruiterApprovalStatus
userSchema.virtual("isApproved").get(function () {
  if (this.role !== "recruiter") return true;
  return this.recruiterApprovalStatus === "approved";
});
userSchema.virtual("isRecruiterApproved").get(function () {
  if (this.role !== "recruiter") return undefined;
  return this.recruiterApprovalStatus === "approved";
});
userSchema.set("toObject", { virtuals: true });
userSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("User", userSchema);
