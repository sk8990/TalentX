const Subscription = require("../models/Subscription");
const User = require("../models/User");
const { normalizePlanKey, PLAN_KEYS } = require("../config/plans");
const { writeAuditLog } = require("../services/auditService");
const {
  activateSubscription,
  getSubscriptionForUser,
  serializeSubscription
} = require("../services/subscriptionService");

exports.getMySubscription = async (req, res) => {
  try {
    const subscription = await getSubscriptionForUser(req.user);
    return res.json(subscription);
  } catch (err) {
    console.error("getMySubscription error:", err);
    return res.status(500).json({ message: "Unable to load subscription" });
  }
};

exports.cancelSubscription = async (req, res) => {
  try {
    const userId = String(req.user.id).trim();
    const subscription = await Subscription.findOne({
      userId,
      status: { $in: ["active", "free"] }
    });

    if (!subscription) {
      return res.status(404).json({ message: "No active subscription found to cancel" });
    }

    subscription.status = "cancelled";
    await subscription.save();

    await writeAuditLog({
      actorId: userId,
      actorRole: req.user.role,
      action: "SUBSCRIPTION_CANCELLED",
      entityType: "SUBSCRIPTION",
      entityId: subscription._id,
      metadata: { planKey: subscription.planKey }
    });

    return res.json({ message: "Subscription cancelled successfully. Your features remain active until the expiry date." });
  } catch (err) {
    console.error("cancelSubscription error:", err);
    return res.status(500).json({ message: "Unable to cancel subscription" });
  }
};

exports.manualActivate = async (req, res) => {
  try {
    const requestedPlan = String(req.body?.plan || PLAN_KEYS.UNIVERSITY_ENTERPRISE).trim();
    const planKey = normalizePlanKey(requestedPlan);
    if (planKey !== PLAN_KEYS.UNIVERSITY_ENTERPRISE) {
      return res.status(400).json({ message: "Manual activation is only enabled for enterprise demos." });
    }

    const targetUserId = String(req.body?.userId || "").trim();
    if (!targetUserId) {
      return res.status(400).json({ message: "Target user is required for manual activation." });
    }
    if (targetUserId === String(req.user.id)) {
      return res.status(403).json({ message: "Users cannot assign packages to themselves." });
    }

    const targetUser = await User.findById(targetUserId).select("role");
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!["admin", "university_admin"].includes(targetUser.role)) {
      return res.status(400).json({ message: "Enterprise can only be activated for university admin users." });
    }

    const subscription = await activateSubscription({
      owner: targetUser._id,
      ownerRole: targetUser.role,
      planKey,
      provider: "offline_enterprise",
      paymentProvider: "offline_enterprise",
      source: "offline_enterprise",
      payment: { assignedBySuperAdminId: req.user.id },
      startsAt: new Date()
    });

    await writeAuditLog({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "SUBSCRIPTION_MANUALLY_CHANGED",
      entityType: "SUBSCRIPTION",
      entityId: subscription._id,
      metadata: {
        ownerId: targetUser._id,
        ownerRole: targetUser.role,
        planKey
      }
    });

    return res.json({
      message: "Enterprise subscription activated",
      subscription: serializeSubscription(subscription)
    });
  } catch (err) {
    console.error("manualActivateSubscription error:", err);
    return res.status(500).json({ message: "Unable to activate subscription" });
  }
};
