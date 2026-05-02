const mongoose = require("mongoose");

const COLLEGE_STATUSES = ["active", "inactive", "pending", "expired"];

function normalizeDomain(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^@+/, "");
}

const collegeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "College name is required."],
      trim: true
    },
    domain: {
      type: String,
      required: [true, "College domain is required."],
      unique: true,
      trim: true,
      lowercase: true,
      set: normalizeDomain,
      validate: {
        validator: (value) => Boolean(value) && !String(value).includes("@"),
        message: "College domain must not include @."
      }
    },
    enterprisePlanActive: {
      type: Boolean,
      default: false
    },
    enterprisePlanStartDate: {
      type: Date,
      default: null
    },
    enterprisePlanEndDate: {
      type: Date,
      default: null
    },
    collegeAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    status: {
      type: String,
      enum: COLLEGE_STATUSES,
      default: "pending"
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  { timestamps: true }
);

collegeSchema.index({ status: 1 });
collegeSchema.index({ enterprisePlanActive: 1 });

module.exports = mongoose.model("College", collegeSchema);
