const Student = require("../../models/Student");
const OnboardingTemplate = require("../../models/OnboardingTemplate");
const OnboardingStepSubmission = require("../../models/OnboardingStepSubmission");
const {
  STEP_TYPES,
  COMPLETION_STATUSES,
  OPEN_STATUSES
} = require("../../constants/onboarding");

function toObjectIdString(value) {
  return value ? String(value) : "";
}

function normalizeCompanyName(name) {
  return String(name || "Company").trim() || "Company";
}

function normalizeCompanyDomain(rawDomain, companyName) {
  const normalizedRaw = String(rawDomain || "").trim().toLowerCase();
  if (normalizedRaw) {
    return normalizedRaw.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
  }

  return normalizeCompanyName(companyName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .replace(/(^-|-$)/g, "")
    .concat(".com");
}

function isCompletionStatus(status) {
  return COMPLETION_STATUSES.has(status);
}

function isStepOpen(step) {
  return OPEN_STATUSES.has(step.status) || isCompletionStatus(step.status);
}

function getFirstCurrentStep(steps = []) {
  return (
    steps.find((step) => OPEN_STATUSES.has(step.status)) ||
    steps.find((step) => step.status === "approved") ||
    steps[steps.length - 1] ||
    null
  );
}

function buildStepStatusBanner(step) {
  if (!step) return null;

  if (step.status === "under_review" || step.status === "submitted") {
    return {
      tone: "warning",
      title: "Under Review",
      description: "Your submission is with the recruiter team. We will unlock the next step after approval."
    };
  }

  if (step.status === "rejected") {
    return {
      tone: "danger",
      title: "Rejected - Reupload Required",
      description: step.rejectionReason || "Please update the required information and resubmit this step."
    };
  }

  if (step.status === "approved") {
    return { tone: "success", title: "Approved", description: "This step has been approved and the next step is available." };
  }

  if (step.status === "completed") {
    return { tone: "success", title: "Completed", description: "You are all set for this onboarding stage." };
  }

  return null;
}

function unlockNextStep(instance, currentStepId) {
  const stepIndex = instance.steps.findIndex((step) => toObjectIdString(step._id) === toObjectIdString(currentStepId));
  if (stepIndex < 0) return;

  const nextStep = instance.steps[stepIndex + 1];
  if (nextStep && nextStep.status === "locked") {
    nextStep.status = "active";
    nextStep.startedAt = nextStep.startedAt || new Date();
  }
}

function recalculateInstanceState(instance) {
  const currentStep = getFirstCurrentStep(instance.steps);
  const completedSteps = instance.steps.filter((step) => isCompletionStatus(step.status)).length;
  const hasStarted = instance.steps.some((step) => step.status !== "locked");

  instance.summary = {
    ...(instance.summary?.toObject ? instance.summary.toObject() : instance.summary),
    completedSteps,
    totalSteps: instance.steps.length
  };
  instance.currentStep = currentStep?.order || instance.steps.length || 1;
  instance.currentStepKey = currentStep?.key || "";

  if (!hasStarted) {
    instance.status = "not_started";
  } else if (instance.steps.every((step) => isCompletionStatus(step.status))) {
    instance.status = "completed";
    instance.completedAt = instance.completedAt || new Date();
  } else if (currentStep?.type === STEP_TYPES.DAY_ONE_INFO) {
    instance.status = "ready_for_day_one";
  } else {
    instance.status = "in_progress";
  }

  if (instance.steps.some((step) => step.status !== "locked")) {
    instance.onboardingStartedAt = instance.onboardingStartedAt || new Date();
  }

  instance.markModified("summary");
}

function findTemplateStep(template, step) {
  return template?.steps?.find((candidate) => toObjectIdString(candidate._id) === toObjectIdString(step.templateStepId))
    || template?.steps?.find((candidate) => candidate.key === step.key)
    || null;
}

async function findStudentForUser(userId) {
  const student = await Student.findOne({ userId }).populate("userId", "name email role");
  if (!student) {
    const error = new Error("Student profile not found");
    error.statusCode = 404;
    throw error;
  }
  return student;
}

function validateRequiredFields(templateStep, formData) {
  const missingFields = [];
  for (const section of templateStep?.content?.sections || []) {
    for (const field of section.fields || []) {
      if (field.required && !String(formData?.[field.key] || "").trim()) {
        missingFields.push(field.label);
      }
    }
  }

  if (missingFields.length > 0) {
    const error = new Error(`Missing required fields: ${missingFields.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }
}

async function getLatestSubmissionVersion(instanceId, stepKey, session) {
  const query = OnboardingStepSubmission.findOne({ instanceId, stepKey })
    .sort({ version: -1 })
    .select("version");
  if (session) query.session(session);

  const latestSubmission = await query;
  return Number(latestSubmission?.version || 0);
}

async function createSubmissionWithRetry(data, session) {
  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const latestVersion = await getLatestSubmissionVersion(data.instanceId, data.stepKey, session);
    try {
      const docs = await OnboardingStepSubmission.create(
        [{ ...data, version: latestVersion + 1 }],
        session ? { session } : {}
      );
      return docs[0];
    } catch (err) {
      if (err.code === 11000 && attempt < maxRetries - 1) continue;
      throw err;
    }
  }
}

module.exports = {
  toObjectIdString,
  normalizeCompanyName,
  normalizeCompanyDomain,
  isCompletionStatus,
  isStepOpen,
  getFirstCurrentStep,
  buildStepStatusBanner,
  unlockNextStep,
  recalculateInstanceState,
  findTemplateStep,
  findStudentForUser,
  validateRequiredFields,
  getLatestSubmissionVersion,
  createSubmissionWithRetry
};
