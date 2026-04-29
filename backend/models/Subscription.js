const mongoose = require("mongoose");

const SubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Legacy aliases retained while older dashboard code and existing records migrate.
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
      required: true,
      index: true,
    },
    package: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
      default: null,
      index: true,
    },
    roleTarget: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "expired", "cancelled", "pending", "manual_assigned", "free"],
      default: "active",
      index: true,
    },
    startsAt: {
      type: Date,
      default: Date.now,
    },
    endsAt: {
      type: Date,
      default: null,
      index: true,
    },
    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },
    razorpaySubscriptionId: {
      type: String,
      default: null,
    },
    razorpayPaymentId: {
      type: String,
      default: null,
    },
    assignedBySuperAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    source: {
      type: String,
      enum: ["razorpay", "manual", "free", "offline_enterprise"],
      required: true,
    },
    planKey: {
      type: String,
      trim: true,
      index: true,
    },
    plan: {
      type: String,
      trim: true,
      index: true,
    },
    ownerRole: {
      type: String,
      trim: true,
      index: true,
    },
    paymentProvider: {
      type: String,
      trim: true,
    },
    lastPayment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },
    payment: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

SubscriptionSchema.index({ userId: 1, status: 1, endsAt: 1 });
SubscriptionSchema.index({ userId: 1, packageId: 1 });

module.exports = mongoose.model("Subscription", SubscriptionSchema);
