const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: {
      type: String,
      enum: ["student", "recruiter", "admin"],
      required: true
    },
    isActive: {
  type: Boolean,
  default: true
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
