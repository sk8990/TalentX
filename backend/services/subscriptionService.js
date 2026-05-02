const Package = require("../models/Package");
const PackageUsage = require("../models/PackageUsage");
const Subscription = require("../models/Subscription");
const {
  clonePlanConfig,
  getPlansForFeature,
  normalizePlanKey,
  PLAN_KEYS
} = require("../config/plans");

const ACTIVE_STATUSES = ["active", "free", "manual_assigned"];

const LIMIT_ENTITLEMENT_BY_USAGE = {
  job_creation: "jobCreationLimit",
  interview_scheduling: "interviewSchedulingLimit",
  offer_letter_generation: "offerLetterGenerationLimit",
  onboarding_panel_access: "onboardingPanelAccessLimit",
  candidate_management: "candidateManageLimit",
  recruiter_management: "recruiterManageLimit",
  audit_usage: "auditLimit"
};

function getUserId(user) {
  return String(user?._id || user?.id || user || "").trim();
}

function addMonths(date, months) {
  if (!months) return null;
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function toPlainObject(value) {
  if (!value) return {};
  if (value instanceof Map) return Object.fromEntries(value.entries());
  if (typeof value.toObject === "function") return value.toObject({ flattenMaps: true });
  if (typeof value === "object") return { ...value };
  return {};
}

function isUnlimited(value) {
  return Number(value) === -1;
}

function normalizeLimitValue(value) {
  if (isUnlimited(value)) return -1;
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function hasLimit(entitlements, key) {
  return entitlements[key] !== undefined && entitlements[key] !== null;
}

function normalizeBooleanFeatures(features) {
  const source = toPlainObject(features);
  return Object.fromEntries(
    Object.entries(source).filter(([, value]) => typeof value === "boolean").map(([key, value]) => [key, value])
  );
}

function getPackageEntitlements(packageDoc) {
  const packageObject = toPlainObject(packageDoc);
  return toPlainObject(packageObject.entitlements || packageObject.features || {});
}

function buildFeaturesFromPackage(packageDoc) {
  const packageObject = toPlainObject(packageDoc);
  const entitlements = getPackageEntitlements(packageObject);
  const roleTarget = String(packageObject.roleTarget || "").trim();
  const features = normalizeBooleanFeatures(entitlements);

  if (roleTarget === "student") {
    return {
      studentProfile: true,
      jobApplications: true,
      applicationTracking: true,
      assessmentAccess: true,
      interviewTracking: true,
      offerAcceptance: true,
      onboardingPortal: true,
      ...features
    };
  }

  if (roleTarget === "recruiter") {
    if (hasLimit(entitlements, "jobCreationLimit")) {
      features.jobPosting = true;
      features.basicApplicantTracking = true;
    }
    if (hasLimit(entitlements, "interviewSchedulingLimit")) {
      features.interviewScheduling = true;
    }
    if (hasLimit(entitlements, "offerLetterGenerationLimit")) {
      features.offerGeneration = true;
    }
    if (hasLimit(entitlements, "onboardingPanelAccessLimit")) {
      features.onboardingManagement = true;
    }
    if (entitlements.exclusiveAiSupport === true) {
      features.exclusiveAiSupport = true;
      features.aiJdGeneration = true;
      features.aiCandidateMatching = true;
      features.assessmentPanel = true;
      features.humanInterviewPanel = true;
      features.prioritySupport = true;
    }
    return features;
  }

  if (roleTarget === "admin" || roleTarget === "university" || roleTarget === "university_admin") {
    features.adminDashboard = true;
    if (hasLimit(entitlements, "candidateManageLimit")) {
      features.bulkStudentManagement = true;
    }
    if (hasLimit(entitlements, "recruiterManageLimit")) {
      features.multiCompanyPlacementManagement = true;
    }
    if (hasLimit(entitlements, "auditLimit")) {
      features.reportsAnalytics = true;
    }
    if (entitlements.deleteJobFeature === true) {
      features.deleteJobFeature = true;
    }
    features.customOnboardingWorkflows = entitlements.customOnboardingWorkflows !== false;
    features.dedicatedSupport = entitlements.dedicatedSupport !== false;
    return features;
  }

  return features;
}

function buildLimitsFromPackage(packageDoc) {
  const entitlements = getPackageEntitlements(packageDoc);
  const jobCreationLimit = normalizeLimitValue(entitlements.jobCreationLimit);
  const applicantsPerMonth = normalizeLimitValue(entitlements.applicantsPerMonth ?? entitlements.monthlyApplicants);

  return {
    activeJobs: jobCreationLimit,
    jobCreationLimit,
    interviewSchedulingLimit: normalizeLimitValue(entitlements.interviewSchedulingLimit),
    offerLetterGenerationLimit: normalizeLimitValue(entitlements.offerLetterGenerationLimit),
    onboardingPanelAccessLimit: normalizeLimitValue(entitlements.onboardingPanelAccessLimit),
    candidateManageLimit: normalizeLimitValue(entitlements.candidateManageLimit),
    recruiterManageLimit: normalizeLimitValue(entitlements.recruiterManageLimit),
    auditLimit: normalizeLimitValue(entitlements.auditLimit),
    applicantsPerMonth,
    monthlyApplicants: applicantsPerMonth,
    studentsLimit: normalizeLimitValue(entitlements.studentsLimit),
    recruitersLimit: normalizeLimitValue(entitlements.recruitersLimit),
    unlimitedJobs: isUnlimited(entitlements.jobCreationLimit),
    unlimitedApplicants: isUnlimited(applicantsPerMonth)
  };
}

function getBillingPeriodMonthsFromPackage(packageDoc) {
  const cycle = String(packageDoc?.billingCycle || "").trim().toLowerCase();
  if (cycle === "monthly") return 1;
  if (cycle === "yearly") return 12;
  return null;
}

function getUsageResetCycle(packageDoc) {
  const cycle = String(packageDoc?.billingCycle || "").trim().toLowerCase();
  if (cycle === "monthly") return "monthly";
  if (cycle === "yearly") return "yearly";
  return "never";
}

function serializePlanConfig(planKey, user) {
  const plan = clonePlanConfig(planKey);
  if (!plan) return null;
  const packageLike = {
    key: plan.key || planKey,
    name: plan.name,
    roleTarget: plan.ownerRoles?.[0] || user?.role,
    entitlements: {
      ...toPlainObject(plan.features),
      jobCreationLimit: plan.limits?.activeJobs,
      applicantsPerMonth: plan.limits?.applicantsPerMonth ?? plan.limits?.monthlyApplicants
    }
  };
  return {
    _id: null,
    userId: getUserId(user) || null,
    owner: getUserId(user) || null,
    ownerRole: user?.role || null,
    packageId: null,
    package: null,
    planKey,
    plan: planKey,
    paymentProvider: planKey === PLAN_KEYS.STUDENT_FREE ? "free" : null,
    provider: planKey === PLAN_KEYS.STUDENT_FREE ? "system" : null,
    status: planKey === PLAN_KEYS.STUDENT_FREE ? "free" : "inactive",
    limits: buildLimitsFromPackage(packageLike),
    features: buildFeaturesFromPackage(packageLike),
    lastPayment: null,
    payment: {},
    startsAt: null,
    endsAt: null,
    expiresAt: null
  };
}

function serializeSubscription(subscription, userFallback = null) {
  if (!subscription) return null;

  const source = typeof subscription.toObject === "function"
    ? subscription.toObject({ flattenMaps: true })
    : subscription;
  const packageDoc = source.packageId || source.package || null;
  const normalizedPlanKey = normalizePlanKey(source.planKey || source.plan || packageDoc?.key || null);
  const ownerId = source.userId || source.owner || getUserId(userFallback) || null;
  const ownerRole = source.ownerRole || source.roleTarget || userFallback?.role || null;
  const paymentProvider = source.paymentProvider || source.source || null;

  return {
    _id: source._id || null,
    userId: ownerId,
    owner: ownerId,
    ownerRole,
    packageId: packageDoc?._id || source.packageId || null,
    package: packageDoc || null,
    planKey: normalizedPlanKey || null,
    plan: source.plan || normalizedPlanKey || null,
    paymentProvider,
    provider: paymentProvider,
    status: source.status || "inactive",
    limits: packageDoc ? buildLimitsFromPackage(packageDoc) : toPlainObject(source.limits),
    features: packageDoc ? buildFeaturesFromPackage(packageDoc) : normalizeBooleanFeatures(source.features),
    lastPayment: source.lastPayment || source.payment?.lastPaymentId || null,
    payment: source.payment || {},
    startsAt: source.startsAt || null,
    endsAt: source.endsAt || source.expiresAt || null,
    expiresAt: source.endsAt || source.expiresAt || null
  };
}

function buildInactiveSubscription(user) {
  return {
    _id: null,
    userId: getUserId(user) || null,
    owner: getUserId(user) || null,
    ownerRole: user?.role || null,
    packageId: null,
    package: null,
    planKey: null,
    plan: null,
    paymentProvider: null,
    provider: null,
    status: "inactive",
    limits: {},
    features: {},
    lastPayment: null,
    payment: {},
    startsAt: null,
    endsAt: null,
    expiresAt: null
  };
}

function buildStudentFreeSubscription(user) {
  return serializePlanConfig(PLAN_KEYS.STUDENT_FREE, user) || buildInactiveSubscription(user);
}

function isSubscriptionUsable(subscription, now = new Date()) {
  if (!subscription || !ACTIVE_STATUSES.includes(subscription.status)) return false;
  const endDate = subscription.endsAt || subscription.expiresAt;
  if (endDate && new Date(endDate).getTime() <= now.getTime()) return false;
  return true;
}

async function getActivePackageForUser(userId) {
  const normalizedUserId = getUserId(userId);
  if (!normalizedUserId) return null;

  const now = new Date();
  const subscriptions = await Subscription.find({
    $or: [{ userId: normalizedUserId }, { owner: normalizedUserId }],
    status: { $in: ACTIVE_STATUSES },
    $and: [
      {
        $or: [
          { endsAt: null },
          { endsAt: { $exists: false } },
          { endsAt: { $gt: now } },
          { expiresAt: { $gt: now } }
        ]
      }
    ]
  })
    .populate("packageId")
    .populate("package")
    .sort({ endsAt: -1, expiresAt: -1, updatedAt: -1 });

  return subscriptions.find((subscription) => isSubscriptionUsable(subscription, now)) || null;
}

async function getSubscriptionForUser(user) {
  const userId = getUserId(user);
  if (!userId) return buildInactiveSubscription(user);

  const subscription = await getActivePackageForUser(userId);
  if (subscription) {
    return serializeSubscription(subscription, user);
  }

  if (user?.role === "student") {
    return buildStudentFreeSubscription(user);
  }

  return buildInactiveSubscription(user);
}

async function getPackageByPlanKey(planKey) {
  const normalizedPlanKey = normalizePlanKey(planKey);
  if (!normalizedPlanKey) return null;
  return Package.findOne({ key: normalizedPlanKey });
}

async function initializePackageUsageRows({ userId, packageDoc }) {
  const entitlements = getPackageEntitlements(packageDoc);
  const resetCycle = getUsageResetCycle(packageDoc);
  const tasks = Object.entries(LIMIT_ENTITLEMENT_BY_USAGE)
    .filter(([, entitlementKey]) => hasLimit(entitlements, entitlementKey))
    .map(([usageType, entitlementKey]) => {
      const limitCount = normalizeLimitValue(entitlements[entitlementKey]);
      return PackageUsage.updateOne(
        { userId, usageType },
        {
          $set: {
            packageId: packageDoc._id,
            limitCount,
            resetCycle
          },
          $setOnInsert: {
            usedCount: 0,
            lastResetAt: new Date()
          }
        },
        { upsert: true }
      );
    });

  await Promise.all(tasks);
}

async function activateSubscription({
  owner,
  ownerRole,
  planKey,
  plan,
  packageDoc = null,
  provider = "razorpay",
  paymentProvider,
  payment = {},
  startsAt = new Date(),
  source
}) {
  const ownerId = getUserId(owner);
  const normalizedPlanKey = normalizePlanKey(planKey || plan || packageDoc?.key);
  const resolvedPackage = packageDoc || await getPackageByPlanKey(normalizedPlanKey);

  if (!ownerId) throw new Error("Subscription owner is required");
  if (!resolvedPackage) throw new Error("Invalid subscription package");

  const normalizedRole = ownerRole || resolvedPackage.roleTarget || "recruiter";
  const resolvedSource = source || paymentProvider || provider || "manual";
  const status = normalizedPlanKey === PLAN_KEYS.STUDENT_FREE ? "free" : "active";
  const endsAt = addMonths(startsAt, getBillingPeriodMonthsFromPackage(resolvedPackage));

  await Subscription.updateMany(
    {
      userId: ownerId,
      status: { $in: ACTIVE_STATUSES }
    },
    { $set: { status: "expired" } }
  );

  const subscription = await Subscription.findOneAndUpdate(
    {
      userId: ownerId,
      packageId: resolvedPackage._id
    },
    {
      $set: {
        userId: ownerId,
        owner: ownerId,
        packageId: resolvedPackage._id,
        package: resolvedPackage._id,
        roleTarget: resolvedPackage.roleTarget,
        status,
        startsAt,
        endsAt,
        expiresAt: endsAt,
        razorpayPaymentId: payment.razorpayPaymentId || null,
        assignedBySuperAdminId: payment.assignedBySuperAdminId || null,
        source: resolvedSource,
        planKey: normalizedPlanKey,
        plan: normalizedPlanKey,
        ownerRole: normalizedRole,
        paymentProvider: resolvedSource,
        lastPayment: payment.lastPaymentId || null,
        payment
      }
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true
    }
  ).populate("packageId");

  await initializePackageUsageRows({ userId: ownerId, packageDoc: resolvedPackage });
  return subscription;
}

function getRequiredPlansForFeature(featureName) {
  return getPlansForFeature(featureName);
}

module.exports = {
  ACTIVE_STATUSES,
  LIMIT_ENTITLEMENT_BY_USAGE,
  activateSubscription,
  buildFeaturesFromPackage,
  buildLimitsFromPackage,
  getActivePackageForUser,
  getPackageEntitlements,
  getRequiredPlansForFeature,
  getSubscriptionForUser,
  isSubscriptionUsable,
  isUnlimited,
  serializeSubscription
};
