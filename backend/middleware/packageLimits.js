const { checkPackageLimit, incrementPackageUsage, hasFeatureAccess } = require("../services/packageEntitlementService");

/**
 * Middleware to enforce package limits for a specific usage type.
 * @param {string} usageType - The type of usage to check (e.g., 'job_creation')
 */
const enforceLimit = (usageType) => {
  return async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Authentication required" });

      const result = await checkPackageLimit(req.user.id, usageType);
      if (!result.allowed) {
        return res.status(403).json({
          success: false,
          code: "PACKAGE_QUOTA_EXHAUSTED",
          limit: result.limit,
          usedCount: result.usedCount,
          message: result.message || "Your package quota has been exhausted. Upgrade your package to continue."
        });
      }
      return next();
    } catch (err) {
      console.error(`enforceLimit error for ${usageType}:`, err);
      return res.status(500).json({ message: "Unable to validate package limits" });
    }
  };
};

/**
 * Middleware to enforce feature access based on boolean entitlements.
 * @param {string} featureKey - The key in entitlements (e.g., 'exclusiveAiSupport')
 */
const enforceFeature = (featureKey) => {
  return async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Authentication required" });

      const hasAccess = await hasFeatureAccess(req.user.id, featureKey);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          code: "PACKAGE_FEATURE_DISABLED",
          message: "This feature is not included in your current package."
        });
      }
      return next();
    } catch (err) {
      console.error(`enforceFeature error for ${featureKey}:`, err);
      return res.status(500).json({ message: "Unable to validate feature access" });
    }
  };
};

module.exports = {
  enforceLimit,
  enforceFeature
};
