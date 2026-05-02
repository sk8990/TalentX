const fs = require("fs");
const Application = require("../models/Application");
const Job = require("../models/Job");
const { expireJobsByDeadline } = require("../utils/jobExpiry");
const { getSubscriptionForUser } = require("../services/subscriptionService");

function isUnlimited(value) {
  return Number(value) === -1;
}

function parseNonUnlimitedLimit(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function removeUploadedFile(req) {
  if (req.file?.path) {
    fs.unlink(req.file.path, () => { });
  }
}

function getMonthWindow(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
}

async function requireJobLimit(req, res, next) {
  try {
    if (req.user?.role !== "recruiter") {
      return next();
    }

    if (req.body?.isActive === false) {
      return next();
    }

    const subscription = req.subscription || await getSubscriptionForUser(req.user);
    req.subscription = subscription;
    const limit = subscription?.limits?.activeJobs;

    if (isUnlimited(limit)) {
      return next();
    }

    const numericLimit = parseNonUnlimitedLimit(limit);
    if (numericLimit === null) {
      return res.status(403).json({
        message: "An active recruiter plan is required to create jobs.",
        feature: "jobPosting",
        currentPlan: subscription?.plan || null,
        requiredPlans: ["recruiter_starter", "recruiter_pro", "enterprise"]
      });
    }

    await expireJobsByDeadline();

    const filter = {
      recruiterId: req.user.id,
      isActive: true
    };

    if (req.params?.jobId) {
      filter._id = { $ne: req.params.jobId };
    }

    const activeJobs = await Job.countDocuments(filter);
    if (activeJobs >= numericLimit) {
      return res.status(403).json({
        success: false,
        code: "PACKAGE_QUOTA_EXHAUSTED",
        message: `Your current plan allows up to ${numericLimit} active jobs. Upgrade to post more jobs.`,
        limit: numericLimit,
        usedCount: activeJobs,
        currentActiveJobs: activeJobs,
        currentPlan: subscription?.plan || null
      });
    }

    return next();
  } catch (err) {
    console.error("requireJobLimit error:", err);
    return res.status(500).json({ message: "Unable to validate job limits" });
  }
}

async function requireApplicantMonthlyLimit(req, res, next) {
  try {
    const jobId = String(req.body?.jobId || "").trim();
    if (!jobId) {
      return next();
    }

    const job = await Job.findById(jobId).select("recruiterId");
    if (!job?.recruiterId) {
      return next();
    }

    const subscription = await getSubscriptionForUser({
      id: job.recruiterId.toString(),
      role: "recruiter"
    });
    const limit = subscription?.limits?.monthlyApplicants;

    // -1 is the only value that means unlimited.
    if (isUnlimited(limit)) {
      return next();
    }

    // null / undefined / NaN means the feature is not configured on this plan.
    // Do NOT silently pass through — treat as "no entitlement" and block.
    const numericLimit = parseNonUnlimitedLimit(limit);
    if (numericLimit === null) {
      removeUploadedFile(req);
      return res.status(403).json({
        message: "An active recruiter plan is required to accept applications.",
        feature: "applicantTracking",
        currentPlan: subscription?.plan || null
      });
    }

    const recruiterJobs = await Job.find({ recruiterId: job.recruiterId }).select("_id");
    const jobIds = recruiterJobs.map((item) => item._id);
    const { start, end } = getMonthWindow();
    const monthlyApplicants = await Application.countDocuments({
      jobId: { $in: jobIds },
      createdAt: { $gte: start, $lt: end }
    });

    if (monthlyApplicants >= numericLimit) {
      removeUploadedFile(req);
      return res.status(403).json({
        message: "This recruiter has reached their monthly applicant limit for the current plan.",
        limit: numericLimit,
        currentApplicants: monthlyApplicants,
        recruiterPlan: subscription?.plan || null
      });
    }

    return next();
  } catch (err) {
    removeUploadedFile(req);
    console.error("requireApplicantMonthlyLimit error:", err);
    return res.status(500).json({ message: "Unable to validate applicant limits" });
  }
}

module.exports = {
  requireApplicantMonthlyLimit,
  requireJobLimit
};
