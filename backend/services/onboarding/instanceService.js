const Company = require("../../models/Company");
const Application = require("../../models/Application");
const OnboardingTemplate = require("../../models/OnboardingTemplate");
const OnboardingInstance = require("../../models/OnboardingInstance");
const { buildDefaultTemplateDefinition } = require("./defaultTemplate");
const { STEP_TYPES } = require("../../constants/onboarding");
const {
  toObjectIdString,
  normalizeCompanyName,
  normalizeCompanyDomain,
  isCompletionStatus,
  findStudentForUser,
  recalculateInstanceState
} = require("./helpers");

async function ensureCompanyRecord(job) {
  const companyName = normalizeCompanyName(job?.companyName);
  const domain = normalizeCompanyDomain(job?.companyDomain, companyName);

  let company = await Company.findOne(
    domain
      ? { $or: [{ domain }, { name: companyName }] }
      : { name: companyName }
  );

  if (!company) {
    company = await Company.create({
      name: companyName,
      domain,
      logo: job?.companyLogo || "",
      verified: true
    });
    return company;
  }

  let changed = false;
  if (!company.logo && job?.companyLogo) {
    company.logo = job.companyLogo;
    changed = true;
  }
  if (!company.domain && domain) {
    company.domain = domain;
    changed = true;
  }
  if (changed) {
    await company.save();
  }

  return company;
}

async function ensureTemplateForCompany({ company, job }) {
  let template = await OnboardingTemplate.findOne({
    $or: [
      company?._id ? { companyId: company._id } : null,
      { companyName: normalizeCompanyName(company?.name || job?.companyName) }
    ].filter(Boolean),
    isActive: true
  }).sort({ updatedAt: -1 });

  if (template) {
    const jobId = toObjectIdString(job?._id);
    if (jobId && !template.sourceJobIds.some((value) => toObjectIdString(value) === jobId)) {
      template.sourceJobIds.push(job._id);
      await template.save();
    }
    return template;
  }

  const definition = buildDefaultTemplateDefinition(normalizeCompanyName(company?.name || job?.companyName));

  template = await OnboardingTemplate.create({
    companyId: company?._id || null,
    companyName: normalizeCompanyName(company?.name || job?.companyName),
    templateName: definition.templateName,
    version: definition.version,
    sourceJobIds: job?._id ? [job._id] : [],
    steps: definition.steps
  });

  return template;
}

function createStepsFromTemplate(template, application) {
  const offerAccepted = String(application?.offer?.status || "").toUpperCase() === "ACCEPTED";

  return template.steps
    .sort((a, b) => a.order - b.order)
    .map((step, index) => {
      let status = "locked";
      if (index === 0) {
        status = offerAccepted ? "completed" : "active";
      } else if (index === 1 && offerAccepted) {
        status = "active";
      }

      return {
        key: step.key,
        order: step.order,
        title: step.title,
        type: step.type,
        templateStepId: step._id,
        status,
        startedAt: status === "active" ? new Date() : null,
        completedAt: status === "completed" ? new Date() : null,
        meta: {}
      };
    });
}

function syncOfferStepWithApplication(instance, application) {
  const offerStep = instance.steps.find((step) => step.type === STEP_TYPES.OFFER_ACCEPTANCE);
  const documentsStep = instance.steps.find((step) => step.type === STEP_TYPES.DOCUMENT_COLLECTION);
  const offerAccepted = String(application?.offer?.status || "").toUpperCase() === "ACCEPTED";

  if (!offerStep) return;

  if (offerAccepted && !isCompletionStatus(offerStep.status)) {
    offerStep.status = "completed";
    offerStep.completedAt = offerStep.completedAt || new Date();
  }

  if (offerAccepted && documentsStep && documentsStep.status === "locked") {
    documentsStep.status = "active";
    documentsStep.startedAt = documentsStep.startedAt || new Date();
  }
}

function matchesInstanceIdentifier(instance, identifier) {
  const normalizedIdentifier = toObjectIdString(identifier);
  if (!normalizedIdentifier) return false;

  return (
    toObjectIdString(instance._id) === normalizedIdentifier ||
    toObjectIdString(instance.applicationId) === normalizedIdentifier ||
    toObjectIdString(instance.companyId) === normalizedIdentifier
  );
}

async function ensureOnboardingInstanceForApplication({ application, student }) {
  if (!application?.jobId) return null;

  const company = await ensureCompanyRecord(application.jobId);
  const template = await ensureTemplateForCompany({ company, job: application.jobId });

  let instance = await OnboardingInstance.findOne({
    studentId: student._id,
    applicationId: application._id
  });

  if (!instance) {
    instance = new OnboardingInstance({
      studentId: student._id,
      userId: student.userId?._id || student.userId,
      companyId: company?._id || null,
      companyName: normalizeCompanyName(application.jobId.companyName),
      companyLogo: application.jobId.companyLogo || company?.logo || "",
      jobId: application.jobId._id,
      applicationId: application._id,
      templateId: template._id,
      steps: createStepsFromTemplate(template, application),
      summary: {
        recruiterId: application.jobId.recruiterId || null,
        completedSteps: 0,
        totalSteps: template.steps.length
      }
    });
  } else {
    instance.companyId = company?._id || null;
    instance.companyName = normalizeCompanyName(application.jobId.companyName);
    instance.companyLogo = application.jobId.companyLogo || company?.logo || "";
    instance.templateId = template._id;
    instance.jobId = application.jobId._id;
    instance.summary = {
      ...(instance.summary?.toObject ? instance.summary.toObject() : instance.summary),
      recruiterId: application.jobId.recruiterId || null,
      totalSteps: instance.steps.length
    };
  }

  syncOfferStepWithApplication(instance, application);
  recalculateInstanceState(instance);
  await instance.save();

  return instance;
}

async function ensureOnboardingInstancesForStudentUser(userId) {
  const student = await findStudentForUser(userId);
  const applications = await Application.find({
    studentId: student._id,
    status: "SELECTED",
    "offer.status": { $in: ["PENDING", "ACCEPTED"] }
  })
    .populate("jobId")
    .sort({ updatedAt: -1 });

  const instances = [];
  for (const application of applications) {
    if (!application.jobId) continue;
    const instance = await ensureOnboardingInstanceForApplication({ application, student });
    if (instance) {
      instances.push(instance);
    }
  }

  return { student, instances };
}

async function findOnboardingInstanceForStudentUser({ userId, identifier }) {
  const { student, instances } = await ensureOnboardingInstancesForStudentUser(userId);
  const normalizedIdentifier = toObjectIdString(identifier);

  if (!normalizedIdentifier) {
    if (instances.length === 1) {
      return { student, instance: instances[0], instances };
    }

    const error = new Error("Onboarding company selection is required");
    error.statusCode = 400;
    throw error;
  }

  const instance = instances.find((item) => matchesInstanceIdentifier(item, normalizedIdentifier));
  if (!instance) {
    const error = new Error("Onboarding instance not found");
    error.statusCode = 404;
    throw error;
  }

  return { student, instance, instances };
}

module.exports = {
  ensureCompanyRecord,
  ensureTemplateForCompany,
  ensureOnboardingInstanceForApplication,
  ensureOnboardingInstancesForStudentUser,
  findOnboardingInstanceForStudentUser,
  syncOfferStepWithApplication
};
