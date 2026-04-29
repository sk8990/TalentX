const mongoose = require("mongoose");

const USER_ROLES = [
  "student",
  "recruiter",
  "admin",
  "university_admin",
  "interviewer",
  "super_admin"
];

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true },
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

    isApproved: {
      type: Boolean,
      default: function () {
        return this.role === "recruiter" ? false : true;
      }
    },

    resetPasswordToken: String,
    resetPasswordExpire: Date
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
