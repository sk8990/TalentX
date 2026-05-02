const mongoose = require("mongoose");
const Payment = require("../models/Payment");
const Package = require("../models/Package");
const User = require("../models/User");
const { writeAuditLog } = require("../services/auditService");
const { activateSubscription } = require("../services/subscriptionService");

const UNIVERSITY_PACKAGE_TARGETS = new Set(["university_admin", "admin", "university"]);

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

    const isUniversityPackage = UNIVERSITY_PACKAGE_TARGETS.has(pkg.roleTarget);
    if (pkg.roleTarget !== user.role && !(isUniversityPackage && ["university_admin", "admin"].includes(user.role))) {
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
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Payment verification fields are required." });
    }

    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id, user: req.user.id });
    if (!payment) return res.status(404).json({ message: "Payment record not found" });

    // ── IDEMPOTENCY GUARD ────────────────────────────────────────────────────
    // If this order was already verified and marked paid, return the stored
    // result immediately.  Do NOT:
    //   • re-activate the subscription (would reset startsAt / endsAt)
    //   • overwrite paidAt with a new timestamp
    //   • write a duplicate PAYMENT_VERIFIED audit log entry
    // ────────────────────────────────────────────────────────────────────────
    if (payment.status === "paid") {
      return res.json({
        alreadyVerified: true,
        message: "Payment already verified",
        payment,
        subscriptionId: payment.subscription || null
      });
    }

    // Credentials are only needed for signature verification, so load them
    // after the idempotency check to avoid the extra async call on repeats.
    const credentials = await getRazorpayCredentials();
    if (credentials.error) return res.status(500).json({ message: credentials.error });

    const crypto = require("crypto");
    const expectedSignature = crypto
      .createHmac("sha256", credentials.keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    // Use timing-safe comparison to prevent timing-oracle attacks.
    // timingSafeEqual throws RangeError when buffers have different lengths
    // (e.g. a truncated or malformed signature from the client).
    // Catch that case explicitly and treat it as a failed verification.
    let signatureMatches = false;
    try {
      const expectedBuf = Buffer.from(expectedSignature, "hex");
      const receivedBuf = Buffer.from(razorpay_signature, "hex");
      if (expectedBuf.length === receivedBuf.length) {
        signatureMatches = crypto.timingSafeEqual(expectedBuf, receivedBuf);
      }
      // If lengths differ, signatureMatches stays false — no exception thrown.
    } catch {
      // Malformed hex or other encoding error — treat as invalid signature.
      signatureMatches = false;
    }

    if (!signatureMatches) {
      payment.status = "failed";
      await payment.save();
      return res.status(400).json({ message: "Payment verification failed" });
    }

    // ── FIRST-TIME SUCCESSFUL VERIFICATION ──────────────────────────────────
    // Capture the exact moment of verification once and never overwrite it.
    const verifiedAt = new Date();

    payment.status = "paid";
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.paidAt = verifiedAt;
    await payment.save();

    const pkg = await Package.findById(payment.package);
    const subscription = await activateSubscription({
      owner: req.user.id,
      ownerRole: req.user.role,
      planKey: payment.planKey,
      packageDoc: pkg,
      provider: "razorpay",
      paymentProvider: "razorpay",
      payment: {
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        lastPaymentId: payment._id
      },
      startsAt: verifiedAt
    });

    payment.subscription = subscription._id;
    await payment.save();

    // Write the audit log exactly once — after both saves succeed.
    await writeAuditLog({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "PAYMENT_VERIFIED",
      entityType: "PAYMENT",
      entityId: payment._id,
      metadata: {
        planKey: payment.planKey,
        packageId: pkg?._id,
        subscriptionId: subscription._id
      }
    });

    return res.json({ message: "Payment verified successfully", payment, subscription });
  } catch (err) {
    console.error("VERIFY RAZORPAY PAYMENT ERROR:", err);
    return res.status(500).json({ message: "Payment verification failed. Please contact support." });
  }
};
