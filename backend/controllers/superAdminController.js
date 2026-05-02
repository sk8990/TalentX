const mongoose = require("mongoose");
const Payment = require("../models/Payment");
const Subscription = require("../models/Subscription");
const User = require("../models/User");
const Job = require("../models/Job");
const Package = require("../models/Package");
const EnterprisePackageRequest = require("../models/EnterprisePackageRequest");
const { writeAuditLog } = require("../services/auditService");
const { activateSubscription, serializeSubscription } = require("../services/subscriptionService");

const UNIVERSITY_ROLES = ["university_admin", "admin"];
const UNIVERSITY_PACKAGE_TARGETS = new Set(["university_admin", "admin", "university"]);
const PACKAGE_ROLE_TARGETS = new Set(["student", "recruiter", "university_admin", "admin", "university"]);
const NUMERIC_ENTITLEMENT_KEYS = new Set([
  "jobCreationLimit",
  "interviewSchedulingLimit",
  "offerLetterGenerationLimit",
  "onboardingPanelAccessLimit",
  "candidateManageLimit",
  "recruiterManageLimit",
  "auditLimit",
  "applicantsPerMonth",
  "monthlyApplicants",
  "jobApplyLimit",
  "aiInterviewLimit",
  "resumeUploadLimit",
  "offerAccessLimit",
  "expectedCandidates",
  "expectedRecruiters"
]);

function parsePage(value, fallback = 1) {
  const page = parseInt(value, 10);
  return Number.isFinite(page) && page > 0 ? page : fallback;
}

function parseLimit(value, fallback = 20, max = 100) {
  const limit = parseInt(value, 10);
  if (!Number.isFinite(limit) || limit <= 0) {
    return fallback;
  }
  return Math.min(limit, max);
}

function buildDateRange(fromDate, toDate) {
  const createdAt = {};
  if (fromDate) {
    const from = new Date(fromDate);
    if (!Number.isNaN(from.getTime())) {
      createdAt.$gte = from;
    }
  }
  if (toDate) {
    const to = new Date(toDate);
    if (!Number.isNaN(to.getTime())) {
      to.setHours(23, 59, 59, 999);
      createdAt.$lte = to;
    }
  }
  return Object.keys(createdAt).length ? createdAt : null;
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function getRevenueSum(match) {
  const data = await Payment.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" }
      }
    }
  ]);
  return data[0]?.total || 0;
}

function toNonNegativeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function toOptionalNumber(value) {
  if (value === "" || value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizePackagePayload(body, userId) {
  const source = body || {};
  const entitlements = source.entitlements && typeof source.entitlements === "object"
    ? { ...source.entitlements }
    : {};

  // Compatibility for older UI payloads that posted { features, limits }.
  if (source.features && typeof source.features === "object") {
    Object.entries(source.features).forEach(([key, value]) => {
      if (typeof value === "boolean") entitlements[key] = value;
    });
  }
  if (source.limits && typeof source.limits === "object") {
    const limitMap = {
      activeJobs: "jobCreationLimit",
      interviewSchedulingLimit: "interviewSchedulingLimit",
      offerLetterGenerationLimit: "offerLetterGenerationLimit",
      onboardingPanelAccessLimit: "onboardingPanelAccessLimit",
      candidateManageLimit: "candidateManageLimit",
      recruiterManageLimit: "recruiterManageLimit",
      auditLimit: "auditLimit",
      applicantsPerMonth: "applicantsPerMonth",
      monthlyApplicants: "applicantsPerMonth"
    };
    Object.entries(limitMap).forEach(([legacyKey, entitlementKey]) => {
      const parsed = toOptionalNumber(source.limits[legacyKey]);
      if (parsed !== undefined) entitlements[entitlementKey] = parsed;
    });
    if (source.limits.unlimitedJobs === true) entitlements.jobCreationLimit = -1;
    if (source.limits.unlimitedApplicants === true && entitlements.candidateManageLimit === undefined) {
      entitlements.candidateManageLimit = -1;
    }
  }

  [
    "jobCreationLimit",
    "interviewSchedulingLimit",
    "offerLetterGenerationLimit",
    "onboardingPanelAccessLimit",
    "candidateManageLimit",
    "recruiterManageLimit",
    "auditLimit",
    "applicantsPerMonth",
    "monthlyApplicants",
    "jobApplyLimit",
    "aiInterviewLimit",
    "resumeUploadLimit",
    "offerAccessLimit",
    "expectedCandidates",
    "expectedRecruiters"
  ].forEach((key) => {
    if (entitlements[key] === "" || entitlements[key] === null || entitlements[key] === undefined) {
      delete entitlements[key];
      return;
    }
    const parsed = Number(entitlements[key]);
    if (Number.isFinite(parsed)) {
      entitlements[key] = parsed;
    }
  });

  return {
    name: String(source.name || "").trim(),
    key: String(source.key || "").trim(),
    description: String(source.description || "").trim(),
    roleTarget: String(source.roleTarget || "").trim(),
    priceInPaise: toNonNegativeNumber(source.priceInPaise ?? source.price, 0),
    currency: String(source.currency || "INR").trim().toUpperCase(),
    billingCycle: String(source.billingCycle || "monthly").trim(),
    razorpayPlanId: String(source.razorpayPlanId || "").trim(),
    label: String(source.label || "").trim(),
    isActive: Boolean(source.isActive),
    isVisibleOnLandingPage: Boolean(source.isVisibleOnLandingPage),
    displayOrder: toNonNegativeNumber(source.displayOrder, 0),
    buttonText: String(source.buttonText || "").trim(),
    buttonActionType: String(source.buttonActionType || "").trim(),
    entitlements,
    updatedBy: userId
  };
}

function validatePackagePayload(payload) {
  const errors = [];
  const roleTarget = String(payload?.roleTarget || "").trim();
  if (!PACKAGE_ROLE_TARGETS.has(roleTarget)) {
    errors.push("Invalid role target.");
  }

  const entitlements = payload?.entitlements || {};
  Object.keys(entitlements).forEach((key) => {
    if (!NUMERIC_ENTITLEMENT_KEYS.has(key)) return;
    const parsed = Number(entitlements[key]);
    if (!Number.isFinite(parsed)) {
      errors.push(`Invalid numeric limit for ${key}.`);
      return;
    }
    if (parsed < -1) {
      errors.push(`Limit for ${key} must be -1 or greater.`);
      return;
    }
    entitlements[key] = parsed;
  });

  return errors;
}

function buildSearchRegex(value) {
  const search = String(value || "").trim();
  return search ? new RegExp(escapeRegex(search), "i") : null;
}

async function getLatestSubscriptionByOwner(userIds) {
  if (!userIds.length) return new Map();
  const subscriptions = await Subscription.find({ userId: { $in: userIds } })
    .sort({ updatedAt: -1, createdAt: -1 })
    .populate("packageId", "name key")
    .select("userId packageId planKey plan status")
    .lean();
  const map = new Map();
  subscriptions.forEach((subscription) => {
    const ownerId = String(subscription.userId || "");
    if (!ownerId || map.has(ownerId)) return;
    map.set(ownerId, subscription);
  });
  return map;
}

async function getLatestPaymentByUser(userIds) {
  if (!userIds.length) return new Map();
  const payments = await Payment.find({ user: { $in: userIds } })
    .sort({ createdAt: -1 })
    .select("user status amount paidAt")
    .lean();
  const map = new Map();
  payments.forEach((payment) => {
    const userId = String(payment.user || "");
    if (!userId || map.has(userId)) return;
    map.set(userId, payment);
  });
  return map;
}

async function listAccounts(req, res, { roles, includeJobs = false }) {
  try {
    const page = parsePage(req.query.page, 1);
    const limit = parseLimit(req.query.limit, 20, 100);
    const skip = (page - 1) * limit;
    const search = String(req.query.search || "").trim();
    const status = String(req.query.status || "").trim().toLowerCase();
    const query = { role: { $in: roles } };
    if (status === "active") query.isActive = true;
    if (status === "disabled") query.isActive = false;
    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      query.$or = [{ name: regex }, { email: regex }];
    }
    const [users, total] = await Promise.all([
      User.find(query)
        .select("name email role isActive recruiterApprovalStatus disabledAt disabledReason createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query)
    ]);
    const userIds = users.map((user) => user._id);
    const [subscriptionMap, paymentMap] = await Promise.all([
      getLatestSubscriptionByOwner(userIds),
      getLatestPaymentByUser(userIds)
    ]);
    const jobsCountMap = new Map();
    if (includeJobs && userIds.length) {
      const jobsAgg = await Job.aggregate([
        { $match: { recruiterId: { $in: userIds } } },
        { $group: { _id: "$recruiterId", jobsCount: { $sum: 1 } } }
      ]);
      jobsAgg.forEach((item) => jobsCountMap.set(String(item._id), item.jobsCount));
    }
    const items = users.map((user) => {
      const id = String(user._id);
      const subscription = subscriptionMap.get(id);
      const payment = paymentMap.get(id);
      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: Boolean(user.isActive),
        isApproved: user.role === "recruiter" ? user.recruiterApprovalStatus === "approved" : true,
        disabledAt: user.disabledAt || null,
        disabledReason: user.disabledReason || "",
        plan: subscription?.planKey || subscription?.plan || null,
        subscriptionStatus: subscription?.status || "none",
        paymentStatus: payment?.status || "none",
        lastPaymentAmount: payment?.amount || 0,
        lastPaidAt: payment?.paidAt || null,
        jobsCount: includeJobs ? jobsCountMap.get(id) || 0 : null,
        createdAt: user.createdAt || null
      };
    });
    return res.json({ items, page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) });
  } catch (err) {
    console.error("listAccounts error:", err);
    return res.status(500).json({ message: "Unable to load accounts" });
  }
}

async function setAccountStatus(req, res, { allowedRoles, shouldEnable }) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!allowedRoles.includes(user.role)) return res.status(400).json({ message: "This account type cannot be changed from this endpoint." });
    if (shouldEnable) {
      user.isActive = true;
      user.disabledBy = null;
      user.disabledAt = null;
      user.disabledReason = "";
    } else {
      const reason = String(req.body?.reason || "").trim() || "Disabled by Super Admin";
      user.isActive = false;
      user.disabledBy = req.user.id;
      user.disabledAt = new Date();
      user.disabledReason = reason;
    }
    await user.save();
    await writeAuditLog({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: shouldEnable ? "ACCOUNT_ENABLED" : "ACCOUNT_DISABLED",
      entityType: "USER",
      entityId: user._id,
      metadata: { targetRole: user.role, reason: user.disabledReason || "" }
    });
    return res.json({ message: shouldEnable ? "Account enabled successfully" : "Account disabled successfully", user });
  } catch (err) {
    console.error("setAccountStatus error:", err);
    return res.status(500).json({ message: "Unable to update account status" });
  }
}

exports.getDashboard = async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [
      totalRevenue,
      monthlyRevenue,
      totalPayments,
      successfulPayments,
      failedPayments,
      activeSubscriptions,
      totalRecruiters,
      totalUniversities,
      disabledAccounts,
      recentPayments,
      recentSubscriptions
    ] = await Promise.all([
      getRevenueSum({ status: "paid" }),
      getRevenueSum({ status: "paid", paidAt: { $gte: monthStart } }),
      Payment.countDocuments(),
      Payment.countDocuments({ status: "paid" }),
      Payment.countDocuments({ status: "failed" }),
      Subscription.countDocuments({ status: { $in: ["active", "free", "manual_assigned"] }, $or: [{ endsAt: null }, { endsAt: { $gt: now } }] }),
      User.countDocuments({ role: "recruiter" }),
      User.countDocuments({ role: { $in: UNIVERSITY_ROLES } }),
      User.countDocuments({ isActive: false, role: { $in: ["recruiter", ...UNIVERSITY_ROLES] } }),
      Payment.find().populate("user", "name email role").populate("package", "name key").sort({ createdAt: -1 }).limit(10).lean(),
      Subscription.find().populate("userId", "name email role").populate("packageId", "name key").sort({ createdAt: -1 }).limit(10).lean()
    ]);
    return res.json({
      totalRevenue,
      monthlyRevenue,
      totalPayments,
      successfulPayments,
      failedPayments,
      activeSubscriptions,
      totalRecruiters,
      totalUniversities,
      disabledAccounts,
      recentPayments,
      recentSubscriptions: recentSubscriptions.map((subscription) => ({
        ...subscription,
        owner: subscription.userId,
        package: subscription.packageId,
        expiresAt: subscription.endsAt
      }))
    });
  } catch (err) {
    console.error("getSuperAdminDashboard error:", err);
    return res.status(500).json({ message: "Unable to load dashboard" });
  }
};

exports.getPackages = async (req, res) => {
  try {
    const packages = await Package.find()
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();

    const userIdSet = new Set();
    packages.forEach((pkg) => {
      if (mongoose.isValidObjectId(pkg.createdBy)) {
        userIdSet.add(String(pkg.createdBy));
      }
      if (mongoose.isValidObjectId(pkg.updatedBy)) {
        userIdSet.add(String(pkg.updatedBy));
      }
    });

    let userMap = new Map();
    if (userIdSet.size) {
      const users = await User.find({ _id: { $in: Array.from(userIdSet) } })
        .select("name email role")
        .lean();
      userMap = new Map(users.map((user) => [String(user._id), user]));
    }

    const hydrated = packages.map((pkg) => ({
      ...pkg,
      createdBy: userMap.get(String(pkg.createdBy)) || pkg.createdBy || null,
      updatedBy: userMap.get(String(pkg.updatedBy)) || pkg.updatedBy || null
    }));

    return res.json({ packages: hydrated });
  } catch (err) {
    console.error("getPackages error:", err);
    return res.status(500).json({ message: "Unable to load packages" });
  }
};

exports.getPayments = async (req, res) => {
  try {
    const page = parsePage(req.query.page, 1);
    const limit = parseLimit(req.query.limit, 20, 100);
    const skip = (page - 1) * limit;
    const query = {};

    if (req.query.status) query.status = String(req.query.status).trim();
    if (req.query.planKey) query.planKey = String(req.query.planKey).trim();
    if (req.query.role) query.userRole = String(req.query.role).trim();
    const dateRange = buildDateRange(req.query.fromDate, req.query.toDate);
    if (dateRange) query.createdAt = dateRange;

    const searchRegex = buildSearchRegex(req.query.search);
    if (searchRegex) {
      const users = await User.find({ $or: [{ name: searchRegex }, { email: searchRegex }] }).select("_id");
      query.$or = [
        { razorpayOrderId: searchRegex },
        { razorpayPaymentId: searchRegex },
        { user: { $in: users.map((user) => user._id) } }
      ];
    }

    const [payments, total] = await Promise.all([
      Payment.find(query)
        .populate("user", "name email role")
        .populate("package", "name key")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payment.countDocuments(query)
    ]);

    return res.json({ payments, page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) });
  } catch (err) {
    console.error("getPayments error:", err);
    return res.status(500).json({ message: "Unable to load payments" });
  }
};

exports.getRevenue = async (_req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [
      totalRevenue,
      revenueThisMonth,
      paidCount,
      failedCount,
      recentPayments
    ] = await Promise.all([
      getRevenueSum({ status: "paid" }),
      getRevenueSum({ status: "paid", paidAt: { $gte: monthStart } }),
      Payment.countDocuments({ status: "paid" }),
      Payment.countDocuments({ status: "failed" }),
      Payment.find({ status: "paid" }).populate("user", "name email role").sort({ paidAt: -1, createdAt: -1 }).limit(10).lean()
    ]);

    return res.json({ totalRevenue, revenueThisMonth, paidCount, failedCount, recentPayments });
  } catch (err) {
    console.error("getRevenue error:", err);
    return res.status(500).json({ message: "Unable to load revenue" });
  }
};

exports.getSubscriptions = async (req, res) => {
  try {
    const page = parsePage(req.query.page, 1);
    const limit = parseLimit(req.query.limit, 20, 100);
    const skip = (page - 1) * limit;
    const query = {};

    if (req.query.status) query.status = String(req.query.status).trim();
    if (req.query.role) query.ownerRole = String(req.query.role).trim();
    if (req.query.planKey) query.planKey = String(req.query.planKey).trim();

    const searchRegex = buildSearchRegex(req.query.search);
    if (searchRegex) {
      const users = await User.find({ $or: [{ name: searchRegex }, { email: searchRegex }] }).select("_id");
      query.userId = { $in: users.map((user) => user._id) };
    }

    const [rows, total] = await Promise.all([
      Subscription.find(query)
        .populate("userId", "name email role")
        .populate("packageId", "name key")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Subscription.countDocuments(query)
    ]);

    const subscriptions = rows.map((subscription) => ({
      ...subscription,
      owner: subscription.userId,
      package: subscription.packageId,
      expiresAt: subscription.endsAt
    }));

    return res.json({ subscriptions, page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) });
  } catch (err) {
    console.error("getSubscriptions error:", err);
    return res.status(500).json({ message: "Unable to load subscriptions" });
  }
};

exports.createPackage = async (req, res) => {
  try {
    const payload = normalizePackagePayload(req.body, req.user.id);
    const errors = validatePackagePayload(payload);
    if (errors.length) {
      return res.status(400).json({ message: errors[0], errors });
    }
    const pkg = await Package.create({ ...payload, createdBy: req.user.id });
    await writeAuditLog({ actorId: req.user.id, actorRole: req.user.role, action: "PACKAGE_CREATED", entityType: "PACKAGE", entityId: pkg._id, metadata: { key: pkg.key, roleTarget: pkg.roleTarget } });
    return res.status(201).json({ message: "Package created successfully", package: pkg });
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ message: "Package key already exists." });
    return res.status(500).json({ message: "Unable to create package" });
  }
};

exports.updatePackage = async (req, res) => {
  try {
    const payload = normalizePackagePayload(req.body, req.user.id);
    const errors = validatePackagePayload(payload);
    if (errors.length) {
      return res.status(400).json({ message: errors[0], errors });
    }
    const pkg = await Package.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!pkg) return res.status(404).json({ message: "Package not found" });
    await writeAuditLog({ actorId: req.user.id, actorRole: req.user.role, action: "PACKAGE_UPDATED", entityType: "PACKAGE", entityId: pkg._id, metadata: { key: pkg.key } });
    return res.json({ message: "Package updated successfully", package: pkg });
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ message: "Package key already exists." });
    return res.status(500).json({ message: "Unable to update package" });
  }
};

exports.togglePackageStatus = async (req, res) => {
  try {
    const pkg = await Package.findById(req.params.id);
    if (!pkg) return res.status(404).json({ message: "Package not found" });
    const field = req.params.field === "visibility" || req.params.field === "landing-visibility"
      ? "isVisibleOnLandingPage"
      : "isActive";
    const requestedValue = req.body.value ?? req.body[field] ?? req.body.isActive ?? req.body.isVisibleOnLandingPage;
    pkg[field] = requestedValue !== undefined ? Boolean(requestedValue) : !pkg[field];
    pkg.updatedBy = req.user.id;
    await pkg.save();
    return res.json({ message: "Status updated successfully", package: pkg });
  } catch (err) {
    return res.status(500).json({ message: "Unable to update status" });
  }
};

exports.getEnterpriseRequests = async (req, res) => {
  try {
    const requests = await EnterprisePackageRequest.find()
      .populate("requestedPackageId", "name")
      .populate("assignedPackageId", "name")
      .populate("requesterUserId", "name email role")
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ requests });
  } catch (err) {
    return res.status(500).json({ message: "Unable to load requests" });
  }
};

exports.handleEnterpriseRequest = async (req, res) => {
  try {
    const { status, assignedPackageId } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Status must be approved or rejected" });
    }

    const request = await EnterprisePackageRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    request.status = status;
    request.reviewedBySuperAdminId = req.user.id;

    if (status === "approved" && !assignedPackageId) {
      return res.status(400).json({ message: "Assigned package is required to approve an enterprise request" });
    }

    if (status === "approved" && assignedPackageId) {
      const pkg = await Package.findById(assignedPackageId);
      if (!pkg) return res.status(404).json({ message: "Package not found" });
      if (!UNIVERSITY_PACKAGE_TARGETS.has(pkg.roleTarget)) {
        return res.status(400).json({ message: "Only university/admin packages can be assigned to enterprise requests" });
      }

      const user = request.email
        ? await User.findOne({ email: request.email })
        : await User.findById(request.requesterUserId);
      if (!user) {
        return res.status(404).json({ message: "No user exists for this request email. Create or invite the university admin first." });
      }
      if (!["admin", "university_admin"].includes(user.role)) {
        return res.status(400).json({ message: "Enterprise packages can only be assigned to university/admin users." });
      }

      const subscription = await activateSubscription({
        owner: user._id,
        ownerRole: user.role,
        planKey: pkg.key,
        packageDoc: pkg,
        source: "offline_enterprise",
        provider: "offline_enterprise",
        paymentProvider: "offline_enterprise",
        payment: { assignedBySuperAdminId: req.user.id },
        startsAt: new Date()
      });

      request.approvedUserId = user._id;
      request.assignedPackageId = pkg._id;
      await request.save();
      return res.json({
        message: "Request approved and package assigned successfully",
        request,
        subscription: serializeSubscription(subscription, user)
      });
    }

    if (assignedPackageId) request.assignedPackageId = assignedPackageId;
    await request.save();
    return res.json({ message: `Request ${status} successfully`, request });
  } catch (err) {
    console.error("handleEnterpriseRequest error:", err);
    return res.status(500).json({ message: "Unable to process request" });
  }
};

exports.assignPackageToUser = async (req, res) => {
  try {
    const { packageId, status = "active" } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    const pkg = await Package.findById(packageId);
    if (!pkg) return res.status(404).json({ message: "Package not found" });
    const isUniversityPackage = UNIVERSITY_PACKAGE_TARGETS.has(pkg.roleTarget);
    if (pkg.roleTarget !== user.role && !(isUniversityPackage && ["university_admin", "admin"].includes(user.role))) {
      return res.status(400).json({ message: "Package role mismatch" });
    }
    const sub = await activateSubscription({
      owner: user._id,
      ownerRole: user.role,
      planKey: pkg.key,
      packageDoc: pkg,
      source: isUniversityPackage ? "offline_enterprise" : "manual",
      provider: isUniversityPackage ? "offline_enterprise" : "manual",
      paymentProvider: isUniversityPackage ? "offline_enterprise" : "manual",
      payment: { assignedBySuperAdminId: req.user.id, requestedStatus: status },
      startsAt: new Date()
    });
    return res.json({ message: "Package assigned successfully", subscription: serializeSubscription(sub, user) });
  } catch (err) {
    console.error("assignPackageToUser error:", err);
    return res.status(500).json({ message: "Unable to assign package" });
  }
};

exports.getUniversities = async (req, res) => { return listAccounts(req, res, { roles: UNIVERSITY_ROLES, includeJobs: false }); };
exports.disableUniversity = async (req, res) => { return setAccountStatus(req, res, { allowedRoles: UNIVERSITY_ROLES, shouldEnable: false }); };
exports.enableUniversity = async (req, res) => { return setAccountStatus(req, res, { allowedRoles: UNIVERSITY_ROLES, shouldEnable: true }); };
exports.getRecruiters = async (req, res) => { return listAccounts(req, res, { roles: ["recruiter"], includeJobs: true }); };
exports.disableRecruiter = async (req, res) => { return setAccountStatus(req, res, { allowedRoles: ["recruiter"], shouldEnable: false }); };
exports.enableRecruiter = async (req, res) => { return setAccountStatus(req, res, { allowedRoles: ["recruiter"], shouldEnable: true }); };
