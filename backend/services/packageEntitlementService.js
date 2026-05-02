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

  // Do not track usage for features that are not configured or are unlimited.
  if (limitValue === undefined || limitValue === null || isUnlimited(limitValue)) return;

  const numericLimit = Number(limitValue);
  if (!Number.isFinite(numericLimit) || numericLimit < 0) return;

  const packageId = subscription.packageId._id;
  const resetCycle = subscription.packageId.billingCycle === "monthly"
    ? "monthly"
    : subscription.packageId.billingCycle === "yearly"
      ? "yearly"
      : "never";

  // Atomic increment using findOneAndUpdate + $inc.
  // This replaces the previous findOne → save pattern which had a race
  // condition: two concurrent requests could both read the same usedCount,
  // both increment it locally, and both write the same value — effectively
  // counting only one use instead of two.
  //
  // With $inc the increment is applied atomically at the database level.
  // The unique index on { userId, usageType } ensures the upsert path also
  // cannot create duplicate documents under concurrent load.
  await PackageUsage.findOneAndUpdate(
    { userId, usageType },
    {
      $inc: { usedCount: 1 },
      $set: {
        packageId,
        limitCount: numericLimit
      },
      $setOnInsert: {
        resetCycle,
        lastResetAt: new Date()
      }
    },
    { upsert: true, new: true }
  );
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
