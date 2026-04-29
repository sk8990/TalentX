const mongoose = require("mongoose");

const enterprisePackageRequestSchema = new mongoose.Schema(
  {
    requesterUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },
    requestedPackageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
      default: null,
      index: true
    },
    assignedPackageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
      default: null,
      index: true
    },
    approvedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },
    reviewedBySuperAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    requesterName: {
      type: String,
      trim: true
    },
    name: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      index: true
    },
    phone: {
      type: String,
      trim: true
    },
    organizationName: {
      type: String,
      trim: true
    },
    roleTarget: {
      type: String,
      trim: true,
      default: "university",
      index: true
    },
    message: {
      type: String,
      trim: true
    },
    expectedCandidates: {
      type: Number,
      default: null
    },
    expectedRecruiters: {
      type: Number,
      default: null
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true
    },
    adminNotes: {
      type: String,
      trim: true
    }
  },
  { timestamps: true, strict: false }
);

module.exports = mongoose.model("EnterprisePackageRequest", enterprisePackageRequestSchema);
