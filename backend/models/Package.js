const mongoose = require("mongoose");

const PackageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    roleTarget: {
      type: String,
      enum: ["student", "recruiter", "admin", "university"],
      required: true,
      index: true,
    },
    priceInPaise: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
      trim: true,
    },
    billingCycle: {
      type: String,
      enum: ["monthly", "yearly", "one_time", "custom", "forever"],
      default: "monthly",
    },
    razorpayPlanId: {
      type: String,
      optional: true,
    },
    label: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: false,
      index: true,
    },
    isVisibleOnLandingPage: {
      type: Boolean,
      default: false,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    buttonText: {
      type: String,
      trim: true,
    },
    buttonActionType: {
      type: String,
      enum: ["get_started", "start_hiring", "upgrade", "contact_sales"],
    },
    entitlements: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Package", PackageSchema);
