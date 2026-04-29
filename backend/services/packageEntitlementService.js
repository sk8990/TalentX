const PackageUsage = require("../models/PackageUsage");
const {
  LIMIT_ENTITLEMENT_BY_USAGE,
  buildFeaturesFromPackage,
  getActivePackageForUser,
  getPackageEntitlements,
  isUnlimited
} = require("./subscriptionService");

function getResetBoundary(resetCycle, date = new Date()) {
  if (resetCycle === "monthly") {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }
  if (resetCycle === "yearly") {
    return new Date(date.getFullYear(), 0, 1);
  }
  return null;
}

async function resetUsageIfNeeded(usage) {
  if (!usage || usage.resetCycle === "never") return usage;

  const boundary = getResetBoundary(usage.resetCycle);
  if (!boundary) return usage;

  const lastResetAt = usage.lastResetAt ? new Date(usage.lastResetAt) : null;
  if (!lastResetAt || lastResetAt.getTime() < boundary.getTime()) {
    usage.usedCount = 0;
    usage.lastResetAt = new Date();
    await usage.save();
  }

  return usage;
}

async function findActiveSubscription(userId) {
  const subscription = await getActivePackageForUser(userId);
  if (!subscription || !subscription.packageId) return null;
  return subscription;
}

async function getPackageEntitlementsForUser(userId) {
  const subscription = await findActiveSubscription(userId);
  if (!subscription) return null;
  return getPackageEntitlements(subscription.packageId);
}

async function checkPackageLimit(userId, usageType) {
  const subscription = await findActiveSubscription(userId);
  if (!subscription) {
    return { allowed: false, message: "No active package found. Please upgrade to continue." };
  }

  const entitlementKey = LIMIT_ENTITLEMENT_BY_USAGE[usageType];
  if (!entitlementKey) throw new Error(`Invalid usageType: ${usageType}`);

  const entitlements = getPackageEntitlements(subscription.packageId);
  const limitValue = entitlements[entitlementKey];
  if (limitValue === undefined || limitValue === null) {
    return { allowed: false, message: "This feature is not included in your current package." };
  }

  if (isUnlimited(limitValue)) {
    return { allowed: true, limit: -1, usedCount: 0 };
  }

  const numericLimit = Number(limitValue);
  if (!Number.isFinite(numericLimit) || numericLimit < 0) {
    return { allowed: false, message: "This package limit is not configured correctly." };
  }

  const usage = await resetUsageIfNeeded(await PackageUsage.findOne({ userId, usageType }));
  const usedCount = usage ? Number(usage.usedCount || 0) : 0;
  if (usedCount >= numericLimit) {
    return {
      allowed: false,
      limit: numericLimit,
      usedCount,
      message: "Your package quota has been exhausted. Upgrade your package to continue."
    };
  }

  return { allowed: true, limit: numericLimit, usedCount };
}

async function incrementPackageUsage(userId, usageType) {
  const subscription = await findActiveSubscription(userId);
  if (!subscription) return;

  const entitlementKey = LIMIT_ENTITLEMENT_BY_USAGE[usageType];
  if (!entitlementKey) return;

  const entitlements = getPackageEntitlements(subscription.packageId);
  const limitValue = entitlements[entitlementKey];
  if (limitValue === undefined || limitValue === null || isUnlimited(limitValue)) return;

  const existing = await resetUsageIfNeeded(await PackageUsage.findOne({ userId, usageType }));
  if (existing) {
    existing.packageId = subscription.packageId._id;
    existing.limitCount = Number(limitValue);
    existing.usedCount = Number(existing.usedCount || 0) + 1;
    await existing.save();
    return;
  }

  await PackageUsage.create({
    userId,
    packageId: subscription.packageId._id,
    usageType,
    usedCount: 1,
    limitCount: Number(limitValue),
    resetCycle: subscription.packageId.billingCycle === "monthly"
      ? "monthly"
      : subscription.packageId.billingCycle === "yearly"
        ? "yearly"
        : "never",
    lastResetAt: new Date()
  });
}

async function hasFeatureAccess(userId, featureKey) {
  const subscription = await findActiveSubscription(userId);
  if (!subscription) return false;
  const features = buildFeaturesFromPackage(subscription.packageId);
  return Boolean(features[featureKey]);
}

module.exports = {
  getActivePackageForUser,
  getPackageEntitlements: getPackageEntitlementsForUser,
  checkPackageLimit,
  incrementPackageUsage,
  hasFeatureAccess,
  isUnlimited
};
