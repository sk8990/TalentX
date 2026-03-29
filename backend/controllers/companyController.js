const Company = require("../models/Company.js");
const Job = require("../models/Job.js");
const Application = require("../models/Application");
const Student = require("../models/Student");
const { expireJobsByDeadline } = require("../utils/jobExpiry");
const seedCompanies = require("../data/companies.js");
const { notify } = require("../services/notificationService");
const { normalizeList } = require("../utils/jobMatch");
const allowedBranches = ["CS", "IT", "ENTC", "MECH", "CIVIL"];

function normalizeDomain(domainInput) {
  const raw = String(domainInput || "").trim().toLowerCase();
  if (!raw) return "";
  return raw
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split("?")[0]
    .trim();
}

function buildLogoDevUrl(domainInput) {
  const domain = normalizeDomain(domainInput);
  if (!domain) return "";

  const apiKey = String(process.env.LOGO_DEV_API_KEY || "").trim();
  if (!apiKey) {
    return `https://img.logo.dev/${domain}`;
  }

  return `https://img.logo.dev/${domain}?token=${encodeURIComponent(apiKey)}`;
}

function normalizeCompanyLogoUrl(logoInput, fallbackDomain) {
  const rawLogo = String(logoInput || "").trim();
  if (!rawLogo) {
    return buildLogoDevUrl(fallbackDomain);
  }

  try {
    const url = new URL(rawLogo);
    if (url.hostname === "img.logo.dev") {
      const domainFromPath = normalizeDomain(url.pathname.replace(/^\//, ""));
      const finalDomain = domainFromPath || normalizeDomain(fallbackDomain);
      if (!finalDomain) return rawLogo;

      const apiKey = String(process.env.LOGO_DEV_API_KEY || "").trim();
      const finalUrl = new URL(`https://img.logo.dev/${finalDomain}`);

      if (apiKey) {
        finalUrl.searchParams.set("token", apiKey);
      }

      if (url.searchParams.has("retina")) {
        finalUrl.searchParams.set("retina", url.searchParams.get("retina") || "true");
      }

      return finalUrl.toString();
    }
  } catch {
    return rawLogo;
  }

  return rawLogo;
}

function sanitizeAndValidateJobInput(body) {
  const companyName = String(body.companyName || "").trim();
  const companyDomain = normalizeDomain(body.companyDomain);
  const companyLogo = String(body.companyLogo || "").trim();
  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim();
  const aboutCompany = String(body.aboutCompany || "").trim();
  const eligibilityText = String(body.eligibilityText || "").trim();
  const deadline = body.deadline;

  const ctc = Number(body.ctc);
  const minCgpa = Number(body.minCgpa);
  const requestedActive = typeof body.isActive === "boolean" ? body.isActive : true;
  const parsedDeadline = deadline ? new Date(deadline) : null;

  const rawBranches = Array.isArray(body.eligibleBranches)
    ? body.eligibleBranches
    : typeof body.eligibleBranches === "string"
      ? body.eligibleBranches.split(",")
      : [];

  const eligibleBranches = rawBranches
    .map((b) => String(b).trim().toUpperCase())
    .filter(Boolean);

  if (!companyName) return { error: "Company name is required" };
  if (!title) return { error: "Job title is required" };
  if (!aboutCompany) return { error: "About company is required" };
  if (Number.isNaN(ctc) || ctc <= 0) return { error: "CTC must be a valid positive number" };
  if (Number.isNaN(minCgpa) || minCgpa < 0 || minCgpa > 10) {
    return { error: "Minimum CGPA must be between 0 and 10" };
  }
  if (!deadline) return { error: "Deadline is required" };
  if (!parsedDeadline || Number.isNaN(parsedDeadline.getTime())) {
    return { error: "Deadline must be a valid date" };
  }
  if (!eligibleBranches.length) return { error: "Select at least one eligible branch" };

  const isExpired = parsedDeadline < new Date();
  const isActive = isExpired ? false : requestedActive;

  const invalidBranch = eligibleBranches.find((branch) => !allowedBranches.includes(branch));
  if (invalidBranch) {
    return { error: `Invalid eligible branch: ${invalidBranch}` };
  }

  return {
    data: {
      companyName,
      companyDomain,
      companyLogo,
      title,
      description,
      ctc,
      aboutCompany,
      minCgpa,
      eligibleBranches,
      eligibilityText,
      deadline: parsedDeadline,
      isActive,
    },
  };
}

function studentWantsJobAlert(student, job) {
  const preferences = student?.preferences || {};
  if (preferences.alertsEnabled === false) {
    return false;
  }

  const preferredMinCtc = Number(preferences.minCtc || 0);
  if (preferredMinCtc > 0 && Number(job.ctc || 0) < preferredMinCtc) {
    return false;
  }

  const rolePreferences = normalizeList(preferences.preferredRoles).map((item) => item.toLowerCase());
  if (rolePreferences.length) {
    const roleText = `${job.title || ""} ${job.description || ""}`.toLowerCase();
    if (!rolePreferences.some((item) => roleText.includes(item))) {
      return false;
    }
  }

  const locationPreferences = normalizeList(preferences.preferredLocations).map((item) => item.toLowerCase());
  if (locationPreferences.length) {
    const locationText = `${job.aboutCompany || ""} ${job.description || ""} ${job.companyName || ""}`.toLowerCase();
    if (!locationPreferences.some((item) => locationText.includes(item))) {
      return false;
    }
  }

  return true;
}

async function notifyStudentsForNewJob(job) {
  const baseFilter = {
    cgpa: { $gte: Number(job.minCgpa || 0) }
  };

  if (Array.isArray(job.eligibleBranches) && job.eligibleBranches.length) {
    baseFilter.branch = { $in: job.eligibleBranches };
  }

  const targetStudents = await Student.find(baseFilter).select("userId preferences");
  const tasks = targetStudents
    .filter((student) => student.userId && studentWantsJobAlert(student, job))
    .map((student) =>
      notify({
        userId: student.userId.toString(),
        type: "JOB_POSTED",
        title: `New Job Match: ${job.title}`,
        message: `${job.companyName} posted a role that matches your preferences.`,
        link: "/student/jobs",
        metadata: {
          jobId: job._id.toString(),
          ctc: job.ctc
        },
        sendMail: false
      })
    );

  if (!tasks.length) {
    return;
  }

  await Promise.allSettled(tasks);
}

exports.createCompany = async (req, res) => {
  try {
    const company = await Company.create(req.body);
    res.status(201).json(company);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCompanies = async (req, res) => {
  try {
    let companies = await Company.find().sort({ name: 1 });

    if (!companies.length) {
      await Company.insertMany(seedCompanies);
      companies = await Company.find().sort({ name: 1 });
    }

    res.json(companies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.postJob = async (req, res) => {
  try {
    const parsed = sanitizeAndValidateJobInput(req.body);
    if (parsed.error) {
      return res.status(400).json({ message: parsed.error });
    }

    const finalDomain =
      parsed.data.companyDomain ||
      normalizeDomain(parsed.data.companyName.toLowerCase().replace(/\s/g, "") + ".com");

    const finalLogo = normalizeCompanyLogoUrl(parsed.data.companyLogo, finalDomain);

    const job = await Job.create({
      ...parsed.data,
      companyDomain: finalDomain,
      companyLogo: finalLogo,
      recruiterId: req.user.id,
    });

    notifyStudentsForNewJob(job).catch((notifyErr) => {
      console.error("postJob notifyStudentsForNewJob error:", notifyErr.message);
    });

    res.status(201).json(job);
  } catch (err) {
    if (err.name === "ValidationError") {
      const details = Object.values(err.errors || {})
        .map((e) => e.message)
        .join(", ");
      return res.status(400).json({ message: details || "Validation failed" });
    }
    if (err.name === "CastError") {
      return res.status(400).json({ message: `Invalid value for ${err.path}` });
    }
    console.error("postJob error:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.getAllJobs = async (req, res) => {
  try {
    await expireJobsByDeadline();
    const jobs = await Job.find().populate("recruiterId", "name email");
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.getRecruiterJobs = async (req, res) => {
  try {
    await expireJobsByDeadline();
    const jobs = await Job.find({ recruiterId: req.user.id });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const parsed = sanitizeAndValidateJobInput(req.body);
    if (parsed.error) {
      return res.status(400).json({ message: parsed.error });
    }

    const finalDomain =
      parsed.data.companyDomain ||
      normalizeDomain(parsed.data.companyName.toLowerCase().replace(/\s/g, "") + ".com");

    const finalLogo = normalizeCompanyLogoUrl(parsed.data.companyLogo, finalDomain);

    const job = await Job.findOneAndUpdate(
      { _id: jobId, recruiterId: req.user.id },
      {
        ...parsed.data,
        companyDomain: finalDomain,
        companyLogo: finalLogo,
      },
      { new: true }
    );

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json(job);
  } catch (err) {
    if (err.name === "ValidationError") {
      const details = Object.values(err.errors || {})
        .map((e) => e.message)
        .join(", ");
      return res.status(400).json({ message: details || "Validation failed" });
    }
    if (err.name === "CastError") {
      return res.status(400).json({ message: `Invalid value for ${err.path}` });
    }
    console.error("updateJob error:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.deleteJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await Job.findOneAndDelete({
      _id: jobId,
      recruiterId: req.user.id
    });

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json({ message: "Job deleted successfully" });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ message: "Invalid job id" });
    }
    res.status(500).json({ message: err.message });
  }
};

exports.getRecruiterStats = async (req, res) => {
  try {
    await expireJobsByDeadline();
    const recruiterId = req.user.id;
    const jobs = await Job.find({ recruiterId }).select("_id");
    const jobIds = jobs.map((job) => job._id);

    const applications = await Application.find({ jobId: { $in: jobIds } }).select("status");
    const selected = applications.filter((application) => application.status === "SELECTED").length;

    res.json({
      jobs: jobs.length,
      totalJobs: jobs.length,
      applications: applications.length,
      selected,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};


