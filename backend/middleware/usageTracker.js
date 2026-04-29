const { incrementPackageUsage } = require("../services/packageEntitlementService");

/**
 * Wrap a controller to increment usage after successful action.
 * @param {Function} controller - The original controller function.
 * @param {string} usageType - The usage type to increment.
 */
function withUsageIncrement(controller, usageType) {
  return async (req, res, next) => {
    const originalResJson = res.json;
    res.json = function (body) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        incrementPackageUsage(req.user.id, usageType).catch(err => console.error("Usage increment error:", err));
      }
      return originalResJson.call(this, body);
    };
    return controller(req, res, next);
  };
}

module.exports = {
  withUsageIncrement
};
