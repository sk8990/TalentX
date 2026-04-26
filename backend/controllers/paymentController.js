const crypto = require("crypto");
const Payment = require("../models/Payment");
const User = require("../models/User");

const PAID_PLANS = {
  recruiter_starter: {
    amount: 99900,
    description: "Recruiter Starter Plan"
  },
  recruiter_pro: {
    amount: 499900,
    description: "Recruiter Pro Plan"
  }
};

function getRazorpayCredentials() {
  const keyId = String(process.env.RAZORPAY_KEY_ID || "").trim();
  const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();

  if (!keyId || !keySecret) {
    return { error: "Razorpay test keys are not configured." };
  }

  if (!keyId.startsWith("rzp_test_")) {
    return { error: "Razorpay Test Mode key is required." };
  }

  return { keyId, keySecret };
}

function loadRazorpaySdk() {
  try {
    return require("razorpay");
  } catch (err) {
    if (err.code === "MODULE_NOT_FOUND") {
      return null;
    }
    throw err;
  }
}

function normalizePlan(plan) {
  return String(plan || "").trim();
}

function isNonPaymentPlan(plan) {
  return plan === "student_free" || plan === "enterprise";
}

function safeSignatureCompare(expectedSignature, receivedSignature) {
  const expected = Buffer.from(String(expectedSignature || ""), "utf8");
  const received = Buffer.from(String(receivedSignature || ""), "utf8");

  if (expected.length !== received.length) {
    return false;
  }

  return crypto.timingSafeEqual(expected, received);
}

exports.createOrder = async (req, res) => {
  try {
    const plan = normalizePlan(req.body?.plan);
    const planConfig = PAID_PLANS[plan];

    if (!planConfig) {
      const message = isNonPaymentPlan(plan)
        ? "This plan does not require payment."
        : "Invalid payment plan selected.";
      return res.status(400).json({ message });
    }

    const credentials = getRazorpayCredentials();
    if (credentials.error) {
      return res.status(500).json({ message: credentials.error });
    }

    const Razorpay = loadRazorpaySdk();
    if (!Razorpay) {
      return res.status(500).json({
        message: "Razorpay package is not installed. Run npm install in the backend folder."
      });
    }

    const user = await User.findById(req.user.id).select("name email role");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const razorpay = new Razorpay({
      key_id: credentials.keyId,
      key_secret: credentials.keySecret
    });

    const receipt = `talentx_${Date.now()}`;
    const order = await razorpay.orders.create({
      amount: planConfig.amount,
      currency: "INR",
      receipt,
      notes: {
        userId: user._id.toString(),
        email: user.email || "",
        plan
      }
    });

    await Payment.create({
      user: user._id,
      role: req.user.role,
      plan,
      amount: order.amount || planConfig.amount,
      currency: order.currency || "INR",
      razorpayOrderId: order.id,
      status: "created",
      paymentProvider: "razorpay",
      metadata: {
        description: planConfig.description,
        receipt,
        razorpayOrderStatus: order.status,
        email: user.email || ""
      }
    });

    return res.status(201).json({
      orderId: order.id,
      amount: order.amount || planConfig.amount,
      currency: order.currency || "INR",
      key: credentials.keyId,
      plan
    });
  } catch (err) {
    console.error("CREATE RAZORPAY ORDER ERROR:", err);
    return res.status(500).json({ message: "Could not start payment. Please try again." });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body || {};
    const plan = normalizePlan(req.body?.plan);

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !plan) {
      return res.status(400).json({ message: "Payment verification fields are required." });
    }

    if (!PAID_PLANS[plan]) {
      return res.status(400).json({ message: "Invalid payment plan selected." });
    }

    const credentials = getRazorpayCredentials();
    if (credentials.error) {
      return res.status(500).json({ message: credentials.error });
    }

    const expectedSignature = crypto
      .createHmac("sha256", credentials.keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const isValid = safeSignatureCompare(expectedSignature, razorpay_signature);

    if (!isValid) {
      await Payment.findOneAndUpdate(
        {
          razorpayOrderId: razorpay_order_id,
          user: req.user.id
        },
        {
          $set: {
            status: "failed",
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
            "metadata.verificationError": "Invalid Razorpay signature",
            "metadata.verifiedAt": new Date()
          }
        },
        { new: true }
      );

      return res.status(400).json({ message: "Payment verification failed" });
    }

    const payment = await Payment.findOneAndUpdate(
      {
        razorpayOrderId: razorpay_order_id,
        user: req.user.id,
        plan
      },
        {
          $set: {
            status: "paid",
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
            "metadata.verifiedAt": new Date()
          }
        },
      { new: true }
    );

    if (!payment) {
      return res.status(404).json({ message: "Payment record not found" });
    }

    // TODO: Activate recruiter subscription once subscription management is added.
    return res.json({
      message: "Payment verified successfully",
      payment
    });
  } catch (err) {
    console.error("VERIFY RAZORPAY PAYMENT ERROR:", err);
    return res.status(500).json({ message: "Payment verification failed. Please contact support." });
  }
};
