const mongoose = require("mongoose");
const Payment = require("../models/Payment");
const Package = require("../models/Package");
const User = require("../models/User");
const { writeAuditLog } = require("../services/auditService");
const { activateSubscription } = require("../services/subscriptionService");

async function getRazorpayCredentials() {
  const keyId = String(process.env.RAZORPAY_KEY_ID || "").trim();
  const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();
  if (!keyId || !keySecret) return { error: "Razorpay test keys are not configured." };
  if (!keyId.startsWith("rzp_test_")) return { error: "Razorpay Test Mode key is required." };
  return { keyId, keySecret };
}

function loadRazorpaySdk() {
  try { return require("razorpay"); } catch (err) { return null; }
}

exports.createOrder = async (req, res) => {
  try {
    const planKey = String(req.body?.planKey || req.body?.plan || "").trim();
    if (!planKey) return res.status(400).json({ message: "Plan key is required." });

    const credentials = await getRazorpayCredentials();
    if (credentials.error) return res.status(500).json({ message: credentials.error });

    const Razorpay = loadRazorpaySdk();
    if (!Razorpay) return res.status(500).json({ message: "Razorpay package not installed." });

    const user = await User.findById(req.user.id).select("name email role");
    if (!user) return res.status(401).json({ message: "User not found" });

    const pkg = await Package.findOne({ key: planKey, isActive: true });
    if (!pkg) return res.status(404).json({ message: "Selected package is not available." });

    if (pkg.roleTarget !== user.role && !(pkg.roleTarget === "university" && ["university_admin", "admin"].includes(user.role))) {
      return res.status(403).json({ message: "This package is not available for your account role." });
    }

    if (pkg.priceInPaise <= 0) return res.status(400).json({ message: "This package does not require payment." });

    const razorpay = new Razorpay({ key_id: credentials.keyId, key_secret: credentials.keySecret });
    const receipt = `talentx_${Date.now()}`;
    const order = await razorpay.orders.create({
      amount: pkg.priceInPaise,
      currency: pkg.currency || "INR",
      receipt,
      notes: { userId: user._id.toString(), email: user.email || "", planKey }
    });

    await Payment.create({
      user: user._id,
      userRole: req.user.role,
      role: req.user.role,
      package: pkg._id,
      planKey,
      plan: planKey,
      amount: order.amount,
      currency: order.currency,
      provider: "razorpay",
      paymentProvider: "razorpay",
      razorpayOrderId: order.id,
      status: "created",
      metadata: { packageName: pkg.name, receipt, email: user.email || "" }
    });

    return res.status(201).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: credentials.keyId,
      planKey,
      packageName: pkg.name
    });
  } catch (err) {
    console.error("CREATE RAZORPAY ORDER ERROR:", err);
    return res.status(500).json({ message: "Could not start payment. Please try again." });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    const planKey = String(req.body?.planKey || req.body?.plan || "").trim();
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return res.status(400).json({ message: "Payment verification fields are required." });

    const credentials = await getRazorpayCredentials();
    if (credentials.error) return res.status(500).json({ message: credentials.error });

    const crypto = require("crypto");
    const expectedSignature = crypto.createHmac("sha256", credentials.keySecret).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");

    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id, user: req.user.id });
    if (!payment) return res.status(404).json({ message: "Payment record not found" });

    if (crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(razorpay_signature))) {
      payment.status = "paid";
      payment.razorpayPaymentId = razorpay_payment_id;
      payment.paidAt = new Date();
      await payment.save();

      const pkg = await Package.findById(payment.package);
      const subscription = await activateSubscription({
        owner: req.user.id,
        ownerRole: req.user.role,
        planKey: payment.planKey,
        packageDoc: pkg,
        provider: "razorpay",
        paymentProvider: "razorpay",
        payment: { razorpayOrderId: razorpay_order_id, razorpayPaymentId: razorpay_payment_id, lastPaymentId: payment._id },
        startsAt: new Date()
      });

      payment.subscription = subscription._id;
      await payment.save();

      await writeAuditLog({
        actorId: req.user.id,
        actorRole: req.user.role,
        action: "PAYMENT_VERIFIED",
        entityType: "PAYMENT",
        entityId: payment._id,
        metadata: { planKey: payment.planKey, packageId: pkg?._id, subscriptionId: subscription._id }
      });

      return res.json({ message: "Payment verified successfully", payment, subscription });
    } else {
      payment.status = "failed";
      await payment.save();
      return res.status(400).json({ message: "Payment verification failed" });
    }
  } catch (err) {
    console.error("VERIFY RAZORPAY PAYMENT ERROR:", err);
    return res.status(500).json({ message: "Payment verification failed. Please contact support." });
  }
};
