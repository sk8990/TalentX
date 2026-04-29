const {
  getRequiredPlansForFeature,
  getSubscriptionForUser
} = require("../services/subscriptionService");

function buildForbiddenPayload(featureName, subscription) {
  return {
    message: "Your current plan does not include this feature.",
    feature: featureName,
    currentPlan: subscription?.plan || null,
    requiredPlans: getRequiredPlansForFeature(featureName)
  };
}

module.exports = function requireFeature(featureName) {
  return async (req, res, next) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: "Login required" });
      }

      const subscription = await getSubscriptionForUser(req.user);
      req.subscription = subscription;

      if (subscription?.features?.[featureName] === true) {
        return next();
      }

      return res.status(403).json(buildForbiddenPayload(featureName, subscription));
    } catch (err) {
      console.error("requireFeature error:", err);
      return res.status(500).json({ message: "Unable to validate subscription access" });
    }
  };
};
