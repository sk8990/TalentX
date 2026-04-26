const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    role: {
      type: String,
      enum: ["student", "recruiter", "admin", "interviewer"]
    },
    plan: {
      type: String,
      enum: ["student_free", "recruiter_starter", "recruiter_pro", "enterprise"],
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
    status: {
      type: String,
      enum: ["created", "paid", "failed"],
      default: "created",
      index: true
    },
    paymentProvider: {
      type: String,
      default: "razorpay"
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
