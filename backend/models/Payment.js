const mongoose = require("mongoose");

const PAYMENT_ROLES = [
  "student",
  "recruiter",
  "admin",
  "university_admin",
  "college_admin",
  "interviewer",
  "super_admin"
];

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    userRole: {
      type: String,
      enum: PAYMENT_ROLES,
      required: false,
      index: true
    },
    // Legacy alias.
    role: {
      type: String,
      enum: PAYMENT_ROLES,
      index: true
    },
    package: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
      default: null,
      index: true
    },
    planKey: {
      type: String,
      required: false,
      index: true
    },
    // Legacy alias.
    plan: {
      type: String,
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: "INR"
    },
    razorpayOrderId: {
      type: String,
      index: true
    },
    razorpayPaymentId: String,
    razorpaySignature: String,
    provider: {
      type: String,
      enum: ["razorpay"],
      default: "razorpay"
    },
    // Legacy alias.
    paymentProvider: {
      type: String,
      enum: ["razorpay"],
      default: "razorpay"
    },
    status: {
      type: String,
      enum: ["created", "paid", "failed", "refunded"],
      default: "created",
      index: true
    },
    paidAt: {
      type: Date,
      default: null
    },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      default: null
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
