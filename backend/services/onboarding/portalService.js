const jwt = require("jsonwebtoken");
const Application = require("../../models/Application");
const Company = require("../../models/Company");
const OnboardingTemplate = require("../../models/OnboardingTemplate");
const OnboardingInstance = require("../../models/OnboardingInstance");
const OnboardingStepSubmission = require("../../models/OnboardingStepSubmission");
const OnboardingDocument = require("../../models/Document");
const {
  buildFallbackTaskContent,
  buildFallbackVideoAsset,
  discoverCompanyLocations,
  discoverCompanyWelcomeVideo,
  generateTaskReading
} = require("./contentService");
const { buildDefaultTemplateDefinition } = require("./defaultTemplate");
const {
  STEP_TYPES,
  STUDENT_ONBOARDING_REQUIRED_DOCUMENTS
} = require("../../constants/onboarding");
const {
  toObjectIdString,
  normalizeCompanyName,
  isCompletionStatus,
  isStepOpen,
  getFirstCurrentStep,
  buildStepStatusBanner,
  findTemplateStep,
  findStudentForUser,
  recalculateInstanceState
} = require("./helpers");
const { ensureOnboardingInstancesForStudentUser } = require("./instanceService");

function buildOfferLetterPreview(application, companyName) {
  const jobTitle = application?.jobId?.title || "your role";
  const location = application?.offer?.location || "the assigned office location";
  const salary = application?.offer?.salary || "the compensation package";
  const joiningDate = application?.offer?.joiningDate
    ? new Date(application.offer.joiningDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "the confirmed joining date";

  return [
    "Dear Candidate,",
    `We are pleased to offer you the position of ${jobTitle} at ${companyName}. This position is full-time and based in ${location}.`,
    `Your starting annual salary will be ${salary}, paid bi-weekly. You will also be eligible for the standard benefits package available to employees in your region.`,
    `Your anticipated start date is ${joiningDate}. Please review and accept this offer to proceed with the onboarding process.`,
    `Sincerely,\nHR Team, ${companyName}`
  ];
}

function buildPassCode(instance) {
  const instanceTail = toObjectIdString(instance?._id).slice(-6).toUpperCase();
  const applicationTail = toObjectIdString(instance?.applicationId).slice(-4).toUpperCase();
  return `TX-${instanceTail}-${applicationTail}`;
}

function buildPseudoQrSvg(passCode) {
  const normalized = String(passCode || "TX").replace(/[^A-Z0-9]/gi, "");
  const cells = 17;
  const squares = [];

  function isFinder(x, y) {
    const inTopLeft = x < 5 && y < 5;
    const inTopRight = x >= cells - 5 && y < 5;
    const inBottomLeft = x < 5 && y >= cells - 5;
    return inTopLeft || inTopRight || inBottomLeft;
  }

  function hashBit(x, y) {
    const source = normalized.charCodeAt((x * 7 + y * 11) % normalized.length) || 0;
    return ((source + x * 13 + y * 17) % 5) < 2;
  }

  for (let y = 0; y < cells; y += 1) {
    for (let x = 0; x < cells; x += 1) {
      let fill = false;
      if (isFinder(x, y)) {
        const localX = x >= cells - 5 ? x - (cells - 5) : x;
        const localY = y >= cells - 5 ? y - (cells - 5) : y;
        fill = localX === 0 || localX === 4 || localY === 0 || localY === 4 || (localX >= 1 && localX <= 3 && localY >= 1 && localY <= 3);
      } else {
        fill = hashBit(x, y);
      }
      if (fill) {
        squares.push(`<rect x="${x}" y="${y}" width="1" height="1" rx="0.12" />`);
      }
    }
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cells} ${cells}" fill="#4f46e5" shape-rendering="crispEdges">
      <rect width="${cells}" height="${cells}" rx="2" fill="#f8faff" />
      ${squares.join("")}
    </svg>
  `;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function buildOfferStepContent({ step, application, templateStep, instance }) {
  const companyName = normalizeCompanyName(instance.companyName);
  return {
    intro: templateStep?.description || step.title,
    offerLetterParagraphs: buildOfferLetterPreview(application, companyName),
    offerLetterUrl: application?.offer?.pdfPath || "",
    applicationId: application?._id || "",
    cards: [
      { key: "role", label: "Role", value: application?.jobId?.title || "Not available" },
      { key: "salary", label: "Annual Salary", value: application?.offer?.salary || "Not available" },
      { key: "location", label: "Location", value: application?.offer?.location || "Not available" },
      {
        key: "joiningDate", label: "Joining Date",
        value: application?.offer?.joiningDate
          ? new Date(application.offer.joiningDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
          : "To be confirmed"
      }
    ],
    acceptanceLabel: templateStep?.content?.acceptanceLabel || "I have reviewed the offer details and accept the role."
  };
}

function normalizeRequiredDocuments() {
  return STUDENT_ONBOARDING_REQUIRED_DOCUMENTS.map((document) => ({ ...document }));
}

function serializeDocumentVerification(verification = {}) {
  return {
    status: verification.status || "not_uploaded",
    expectedName: verification.expectedName || "",
    detectedName: verification.detectedName || "",
    confidence: Number(verification.confidence || 0),
    message: verification.message || "",
    verifiedAt: verification.verifiedAt || null
  };
}

function buildDocumentStepContent({ templateStep, submission, documents }) {
  const formData = submission?.payload?.formData || {};
  const documentMap = new Map(documents.map((document) => [document.documentType.key, document]));
  const requiredDocuments = normalizeRequiredDocuments();

  return {
    intro: templateStep?.description || "",
    sections: (templateStep?.content?.sections || []).map((section) => ({
      ...section,
      fields: (section.fields || []).map((field) => ({ ...field, value: formData[field.key] || "" }))
    })),
    requiredDocuments: requiredDocuments.map((requiredDocument) => {
      const uploadedDocument = documentMap.get(requiredDocument.key);
      return {
        ...requiredDocument,
        document: uploadedDocument
          ? {
            id: uploadedDocument._id,
            originalName: uploadedDocument.storage.originalName,
            status: uploadedDocument.status,
            url: uploadedDocument.storage.url,
            rejectionReason: uploadedDocument.rejectionReason || "",
            verification: serializeDocumentVerification(uploadedDocument.verification)
          }
          : null
      };
    })
  };
}

function buildPreJoiningStepContent({ step, templateStep, submission }) {
  const taskValues = submission?.payload?.tasks || {};
  const acceptedPolicies = Boolean(submission?.payload?.acceptedPolicies);
  const stepMeta = step?.meta && typeof step.meta === "object" ? step.meta : {};
  const cachedReadings = stepMeta.aiReadings && typeof stepMeta.aiReadings === "object" ? stepMeta.aiReadings : {};

  const tasks = (templateStep?.content?.tasks || []).map((task) => ({
    ...task,
    completed: Boolean(taskValues[task.key]),
    hasGeneratedContent: Boolean(cachedReadings[task.key]),
    generatedContentMeta: cachedReadings[task.key]
      ? { title: cachedReadings[task.key].title || task.title, estimatedReadMinutes: Number(cachedReadings[task.key].estimatedReadMinutes || 4) }
      : null
  }));

  return {
    intro: templateStep?.description || "",
    tasks,
    video: stepMeta.videoAsset || templateStep?.content?.video || null,
    acceptedPolicies,
    completedCount: tasks.filter((task) => task.completed).length,
    aiNotice: "Reading material and video suggestions are generated or discovered dynamically for each company. Confirm final policy specifics with HR and official company documents."
  };
}

function buildDayOneStepContent({ templateStep, application, instance }) {
  const joiningDate = application?.offer?.joiningDate
    ? new Date(application.offer.joiningDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "To be announced";
  const reportingTime = templateStep?.content?.reportingTime || "9:00 AM";
  const passCode = buildPassCode(instance);

  return {
    intro: templateStep?.description || "",
    celebrationMessage: "You've completed the required pre-joining formalities. We are excited to welcome you to the team.",
    joiningDate,
    reportingTime,
    location: templateStep?.content?.location || null,
    instructions: templateStep?.content?.instructions || [],
    agenda: templateStep?.content?.agenda || [],
    passLabel: templateStep?.content?.passLabel || "Digital Joining Pass",
    passCode,
    qrCodeSvg: buildPseudoQrSvg(passCode)
  };
}

function serializeStep({ step, templateStep, application, instance, submission, documents }) {
  let content = {};

  if (step.type === STEP_TYPES.OFFER_ACCEPTANCE) {
    content = buildOfferStepContent({ step, templateStep, application, instance });
  } else if (step.type === STEP_TYPES.DOCUMENT_COLLECTION) {
    content = buildDocumentStepContent({ templateStep, submission, documents });
  } else if (step.type === STEP_TYPES.PRE_JOINING) {
    content = buildPreJoiningStepContent({ step, templateStep, submission });
  } else if (step.type === STEP_TYPES.DAY_ONE_INFO) {
    content = buildDayOneStepContent({ templateStep, application, instance });
  }

  return {
    id: step._id,
    key: step.key,
    order: step.order,
    title: step.title,
    type: step.type,
    description: templateStep?.description || "",
    status: step.status,
    isLocked: step.status === "locked",
    isOpen: isStepOpen(step),
    rejectionReason: step.rejectionReason || "",
    reviewNotes: step.reviewNotes || "",
    startedAt: step.startedAt,
    submittedAt: step.submittedAt,
    reviewedAt: step.reviewedAt,
    completedAt: step.completedAt,
    statusBanner: buildStepStatusBanner(step),
    submission: submission
      ? {
        id: submission._id,
        version: submission.version,
        status: submission.status,
        submittedAt: submission.submittedAt,
        reviewedAt: submission.reviewedAt,
        rejectionReason: submission.rejectionReason || "",
        reviewNotes: submission.reviewNotes || ""
      }
      : null,
    documents: documents.map((document) => ({
      id: document._id,
      status: document.status,
      type: document.documentType,
      originalName: document.storage.originalName,
      url: document.storage.url,
      rejectionReason: document.rejectionReason || "",
      verification: serializeDocumentVerification(document.verification),
      updatedAt: document.updatedAt
    })),
    content
  };
}

function serializeInstanceSummary({ instance, application }) {
  const completedSteps = instance.steps.filter((step) => isCompletionStatus(step.status)).length;
  const totalSteps = instance.steps.length || 0;
  const currentStep = getFirstCurrentStep(instance.steps);

  return {
    id: instance._id,
    companyName: instance.companyName,
    companyLogo: instance.companyLogo || "",
    companyDomain: application?.jobId?.companyDomain || "",
    jobRole: application?.jobId?.title || "Offer",
    progress: { completed: completedSteps, total: totalSteps, label: `${completedSteps}/${totalSteps} steps` },
    status: instance.status,
    currentStepLabel: currentStep?.title || "Onboarding",
    offerStatus: application?.offer?.status || "PENDING",
    deadline: instance.deadline || null,
    updatedAt: instance.updatedAt
  };
}

function mapLatestSubmissions(submissions) {
  const map = new Map();
  for (const submission of submissions) {
    const current = map.get(submission.stepKey);
    if (!current || Number(submission.version || 0) > Number(current.version || 0)) {
      map.set(submission.stepKey, submission);
    }
  }
  return map;
}

function mapDocumentsByStep(documents) {
  const map = new Map();
  for (const document of documents) {
    const list = map.get(document.stepKey) || [];
    list.push(document);
    map.set(document.stepKey, list);
  }
  return map;
}

async function buildStudentPortalPayload({ userId, selectedInstanceId }) {
  const { student, instances } = await ensureOnboardingInstancesForStudentUser(userId);
  if (instances.length === 0) {
    return {
      mode: "empty",
      user: { id: student.userId?._id, name: student.userId?.name || "Student", email: student.userId?.email || "" },
      companies: [],
      selectedInstance: null
    };
  }

  const applications = await Application.find({ _id: { $in: instances.map((i) => i.applicationId) } }).populate("jobId");
  const applicationsById = new Map(applications.map((a) => [toObjectIdString(a._id), a]));

  const companyCards = instances
    .map((instance) => serializeInstanceSummary({ instance, application: applicationsById.get(toObjectIdString(instance.applicationId)) }))
    .sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt));

  let selectedInstance = null;
  if (selectedInstanceId) {
    const normalizedSelectedId = toObjectIdString(selectedInstanceId);
    selectedInstance = instances.find((i) => (
      toObjectIdString(i._id) === normalizedSelectedId ||
      toObjectIdString(i.applicationId) === normalizedSelectedId ||
      toObjectIdString(i.companyId) === normalizedSelectedId
    )) || null;
  }

  if (!selectedInstance) {
    return {
      mode: "selector",
      user: { id: student.userId?._id, name: student.userId?.name || "Student", email: student.userId?.email || "" },
      companies: companyCards,
      selectedInstance: null
    };
  }

  const template = await OnboardingTemplate.findById(selectedInstance.templateId);
  const application = applicationsById.get(toObjectIdString(selectedInstance.applicationId))
    || await Application.findById(selectedInstance.applicationId).populate("jobId");
  const submissions = await OnboardingStepSubmission.find({ instanceId: selectedInstance._id }).sort({ version: -1, updatedAt: -1 });
  const latestSubmissions = mapLatestSubmissions(submissions);
  const documents = await OnboardingDocument.find({ instanceId: selectedInstance._id, isLatest: true }).sort({ updatedAt: -1 });
  const documentsByStep = mapDocumentsByStep(documents);

  const stepDetails = selectedInstance.steps
    .sort((left, right) => left.order - right.order)
    .map((step) => serializeStep({
      step,
      templateStep: findTemplateStep(template, step),
      application,
      instance: selectedInstance,
      submission: latestSubmissions.get(step.key) || null,
      documents: documentsByStep.get(step.key) || []
    }));

  const currentStep = selectedInstance.steps.find((s) => s.key === selectedInstance.currentStepKey)
    || getFirstCurrentStep(selectedInstance.steps);
  const currentStepPayload = stepDetails.find((s) => toObjectIdString(s.id) === toObjectIdString(currentStep?._id)) || stepDetails[0] || null;

  const overallBanner = selectedInstance.status === "ready_for_day_one"
    ? { tone: "success", title: "All Set For Your First Day", description: "Your pre-joining tasks are complete. Use the joining pass and agenda below for day one." }
    : selectedInstance.status === "completed"
      ? { tone: "success", title: "Onboarding Completed", description: "Every onboarding step has been completed." }
      : { tone: "info", title: "Onboarding In Progress", description: "Complete the active step to keep moving through your onboarding workflow." };
  const offerStepPayload = stepDetails.find((step) => step.type === STEP_TYPES.OFFER_ACCEPTANCE) || null;
  const documentStepPayload = stepDetails.find((step) => step.type === STEP_TYPES.DOCUMENT_COLLECTION) || null;
  const requiredDocuments = normalizeRequiredDocuments();
  const requiredDocumentKeys = new Set(requiredDocuments.map((document) => document.key));
  const latestRequiredDocuments = (documentStepPayload?.documents || []).filter((document) => requiredDocumentKeys.has(document.type?.key));
  const verifiedDocuments = latestRequiredDocuments.filter((document) => ["verified", "approved"].includes(document.status));
  const manualReviewDocuments = latestRequiredDocuments.filter((document) => document.status === "manual_review");
  const failedDocuments = latestRequiredDocuments.filter((document) => ["name_mismatch", "failed", "rejected"].includes(document.status));
  const verificationStatus = failedDocuments.length > 0
    ? "action_required"
    : latestRequiredDocuments.length >= requiredDocuments.length && manualReviewDocuments.length > 0
      ? "manual_review"
      : verifiedDocuments.length >= requiredDocuments.length
        ? "verified"
        : "pending";

  return {
    mode: "portal",
    user: { id: student.userId?._id, name: student.userId?.name || "Student", email: student.userId?.email || "" },
    companies: companyCards,
    selectedInstance: {
      id: selectedInstance._id,
      applicationId: application?._id || selectedInstance.applicationId,
      companyName: selectedInstance.companyName,
      companyLogo: selectedInstance.companyLogo || "",
      status: selectedInstance.status,
      progress: {
        completed: selectedInstance.summary?.completedSteps || 0,
        total: selectedInstance.summary?.totalSteps || selectedInstance.steps.length,
        label: `${selectedInstance.summary?.completedSteps || 0}/${selectedInstance.summary?.totalSteps || selectedInstance.steps.length}`
      },
      overallBanner,
      offer: {
        applicationId: application?._id || selectedInstance.applicationId,
        salary: application?.offer?.salary || "",
        location: application?.offer?.location || "",
        joiningDate: application?.offer?.joiningDate || null,
        generatedAt: application?.offer?.generatedAt || null,
        offerLetterUrl: application?.offer?.pdfPath || "",
        status: application?.offer?.status || "PENDING",
        acceptedAt: application?.offer?.acceptedAt || null
      },
      acceptanceFlow: {
        candidateName: student.userId?.name || "Student",
        offerAgreementStatus: offerStepPayload?.status === "completed" || application?.offer?.status === "ACCEPTED"
          ? "agreed"
          : "pending",
        requiredDocuments,
        documentsUploadedCount: latestRequiredDocuments.length,
        documentsVerifiedCount: verifiedDocuments.length + manualReviewDocuments.length,
        verificationStatus,
        isOfferAccepted: application?.offer?.status === "ACCEPTED"
      },
      deadline: selectedInstance.deadline || null,
      job: {
        id: application?.jobId?._id || selectedInstance.jobId,
        title: application?.jobId?.title || "Offer",
        companyName: selectedInstance.companyName
      },
      steps: stepDetails,
      currentStepId: currentStepPayload?.id || null,
      currentStep: currentStepPayload
    }
  };
}

async function findStudentOwnedInstanceById({ userId, instanceId }) {
  const { student, instances } = await ensureOnboardingInstancesForStudentUser(userId);
  let instance = instances.find((item) => toObjectIdString(item._id) === toObjectIdString(instanceId)) || null;

  if (!instance) {
    instance = await OnboardingInstance.findOne({ _id: instanceId, studentId: student._id });
  }
  if (!instance && instances.length === 1) {
    instance = instances[0];
  }

  if (!instance) {
    const error = new Error("Onboarding instance not found");
    error.statusCode = 404;
    throw error;
  }

  return { student, instance };
}

async function getPreJoiningStepResources(instance) {
  const step = instance.steps.find((candidate) => candidate.type === STEP_TYPES.PRE_JOINING);

  if (!step) {
    const error = new Error("Pre-joining step not found");
    error.statusCode = 404;
    throw error;
  }

  const application = await Application.findById(instance.applicationId).populate("jobId");
  const company = instance.companyId ? await Company.findById(instance.companyId).select("name domain") : null;
  const template = await OnboardingTemplate.findById(instance.templateId);
  let templateStep = findTemplateStep(template, step);

  if (!templateStep) {
    const fallbackDefinition = buildDefaultTemplateDefinition(normalizeCompanyName(instance.companyName || application?.jobId?.companyName));
    templateStep = fallbackDefinition.steps.find((item) => item.key === step.key || item.type === step.type) || null;
  }

  return { step, templateStep, application, company };
}

function buildPreJoiningGenerationContext({ instance, application, company }) {
  return {
    companyName: instance.companyName,
    companyDomain: company?.domain || application?.jobId?.companyDomain || "",
    jobTitle: application?.jobId?.title || ""
  };
}

const LEARN_MORE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const LEARN_MORE_KEYS = new Set([
  "onboarding-journey",
  "work-culture",
  "locations",
  "learning-growth"
]);

function isFreshCachedPayload(payload, ttlMs = LEARN_MORE_CACHE_TTL_MS) {
  const generatedAt = payload?.generatedAt ? new Date(payload.generatedAt).getTime() : 0;
  return Boolean(generatedAt) && (Date.now() - generatedAt) < ttlMs;
}

function buildJourneyStatusLabel(status) {
  if (status === "completed" || status === "approved") {
    return "Completed";
  }

  if (status === "active" || status === "submitted" || status === "under_review" || status === "rejected") {
    return "In Progress";
  }

  return "Not Started";
}

function buildJourneyTimeline({ instance, template }) {
  return [...(instance?.steps || [])]
    .sort((left, right) => Number(left.order || 0) - Number(right.order || 0))
    .map((step) => {
      const templateStep = findTemplateStep(template, step);
      return {
        id: step._id,
        order: step.order,
        title: step.title,
        type: step.type,
        status: step.status,
        statusLabel: buildJourneyStatusLabel(step.status),
        description: templateStep?.description || ""
      };
    });
}

function hasRenderableLocations(payload) {
  return Array.isArray(payload?.content?.locations) && payload.content.locations.length > 0;
}

function parseCityFromAddress(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  return raw.split(",")[0]?.trim() || "";
}

function dedupeLocationEntries(locations) {
  const map = new Map();

  for (const location of locations) {
    const officeName = String(location?.officeName || "").trim();
    const city = String(location?.city || "").trim();
    const country = String(location?.country || "").trim();
    const address = String(location?.address || "").trim();
    const key = `${officeName}|${city}|${country}|${address}`.toLowerCase();

    if (!key.replace(/\|/g, "")) {
      continue;
    }

    if (!map.has(key)) {
      map.set(key, {
        officeName,
        city,
        country,
        countryCode: String(location?.countryCode || "").trim(),
        address,
        latitude: Number.isFinite(Number(location?.latitude)) ? Number(location.latitude) : null,
        longitude: Number.isFinite(Number(location?.longitude)) ? Number(location.longitude) : null,
        sourceUrl: String(location?.sourceUrl || "").trim()
      });
    }
  }

  return [...map.values()];
}

function buildKnownOfficeLocations({ template, application, companyName }) {
  const fallbackLocations = [];
  const safeCompanyName = normalizeCompanyName(companyName);
  const dayOneStep = (template?.steps || []).find((candidate) => candidate.type === STEP_TYPES.DAY_ONE_INFO);
  const templateLocation = dayOneStep?.content?.location || null;

  if (templateLocation) {
    const addressLines = Array.isArray(templateLocation.addressLines)
      ? templateLocation.addressLines.map((line) => String(line || "").trim()).filter(Boolean)
      : [];
    const address = addressLines.join(", ");

    fallbackLocations.push({
      officeName: String(templateLocation.name || `${safeCompanyName} Office`).trim(),
      city: parseCityFromAddress(addressLines[addressLines.length - 1] || addressLines[0] || ""),
      country: "",
      countryCode: "",
      address,
      latitude: null,
      longitude: null,
      sourceUrl: ""
    });
  }

  const offerLocation = String(application?.offer?.location || "").trim();
  if (offerLocation) {
    fallbackLocations.push({
      officeName: `${safeCompanyName} Office`,
      city: parseCityFromAddress(offerLocation),
      country: "",
      countryCode: "",
      address: offerLocation,
      latitude: null,
      longitude: null,
      sourceUrl: ""
    });
  }

  return dedupeLocationEntries(fallbackLocations);
}

async function buildLearnMoreAiReading({ context, task }) {
  try {
    return await generateTaskReading({ ...context, task });
  } catch (_err) {
    return buildFallbackTaskContent({ ...context, task });
  }
}

function buildFallbackPreJoiningTask({ taskKey, companyName }) {
  const fallbackDefinition = buildDefaultTemplateDefinition(normalizeCompanyName(companyName));
  const fallbackStep = fallbackDefinition.steps.find((item) => item.type === STEP_TYPES.PRE_JOINING);
  const knownTask = (fallbackStep?.content?.tasks || []).find((item) => item.key === taskKey);

  if (knownTask) {
    return knownTask;
  }

  return {
    key: taskKey,
    title: "Pre-Joining Reading",
    description: `Review this onboarding reading item for ${normalizeCompanyName(companyName)} before proceeding.`
  };
}

async function cachePreJoiningMeta({ instance, step, metaPatch }) {
  try {
    const stepMeta = step.meta && typeof step.meta === "object" ? step.meta : {};
    step.meta = {
      ...stepMeta,
      ...metaPatch
    };
    instance.markModified("steps");
    await instance.save();
  } catch (_err) {
    // Non-blocking cache persistence. The API should still return usable content.
  }
}

async function getPreJoiningTaskContent({ userId, instanceId, taskKey }) {
  const { instance } = await findStudentOwnedInstanceById({ userId, instanceId });
  const { step, templateStep, application, company } = await getPreJoiningStepResources(instance);
  const task = (templateStep?.content?.tasks || []).find((item) => item.key === taskKey)
    || buildFallbackPreJoiningTask({ taskKey, companyName: instance.companyName });

  const stepMeta = step.meta && typeof step.meta === "object" ? step.meta : {};
  const cachedReadings = stepMeta.aiReadings && typeof stepMeta.aiReadings === "object" ? stepMeta.aiReadings : {};

  if (cachedReadings[taskKey]) {
    return cachedReadings[taskKey];
  }

  const context = buildPreJoiningGenerationContext({ instance, application, company });
  let reading;

  try {
    reading = await generateTaskReading({ ...context, task });
  } catch (_err) {
    reading = buildFallbackTaskContent({ ...context, task });
  }

  const cachedReading = { ...reading, generatedAt: new Date().toISOString(), taskKey };
  await cachePreJoiningMeta({
    instance,
    step,
    metaPatch: {
      aiReadings: {
        ...cachedReadings,
        [taskKey]: cachedReading
      }
    }
  });

  return cachedReading;
}

async function getPreJoiningVideoAsset({ userId, instanceId }) {
  const { instance } = await findStudentOwnedInstanceById({ userId, instanceId });
  const { step, application, company } = await getPreJoiningStepResources(instance);
  const stepMeta = step.meta && typeof step.meta === "object" ? step.meta : {};

  if (stepMeta.videoAsset && (stepMeta.videoAsset.embedUrl || stepMeta.videoAsset.provider === "none")) {
    return stepMeta.videoAsset;
  }

  const context = buildPreJoiningGenerationContext({ instance, application, company });
  let videoAsset;

  try {
    videoAsset = await discoverCompanyWelcomeVideo(context);
  } catch (_err) {
    videoAsset = buildFallbackVideoAsset(context);
  }

  const cachedVideoAsset = { ...videoAsset, generatedAt: new Date().toISOString() };
  await cachePreJoiningMeta({
    instance,
    step,
    metaPatch: {
      videoAsset: cachedVideoAsset
    }
  });

  return cachedVideoAsset;
}

async function getLearnMoreSectionContent({ userId, instanceId, sectionKey }) {
  if (!LEARN_MORE_KEYS.has(sectionKey)) {
    const error = new Error("Invalid learn more section");
    error.statusCode = 400;
    throw error;
  }

  const { instance } = await findStudentOwnedInstanceById({ userId, instanceId });
  const { step, application, company } = await getPreJoiningStepResources(instance);
  const context = buildPreJoiningGenerationContext({ instance, application, company });

  const stepMeta = step.meta && typeof step.meta === "object" ? step.meta : {};
  const learnMoreCache = stepMeta.learnMore && typeof stepMeta.learnMore === "object" ? stepMeta.learnMore : {};
  const cachedPayload = learnMoreCache[sectionKey];
  const canReuseCachedPayload = isFreshCachedPayload(cachedPayload)
    && (sectionKey !== "locations" || hasRenderableLocations(cachedPayload));

  if (canReuseCachedPayload) {
    return cachedPayload;
  }

  let payload;

  if (sectionKey === "onboarding-journey") {
    const template = await OnboardingTemplate.findById(instance.templateId);
    const timeline = buildJourneyTimeline({ instance, template });
    const timelineText = timeline
      .map((item) => `Step ${item.order}: ${item.title} (${item.statusLabel})`)
      .join("; ");

    const journeyReading = await buildLearnMoreAiReading({
      context,
      task: {
        key: "onboardingJourney",
        title: "Onboarding Journey",
        description: `Explain the onboarding journey clearly for a student. Use this current timeline context: ${timelineText}`
      }
    });

    payload = {
      sectionKey,
      title: "Onboarding Journey",
      subtitle: "Understand your complete journey from offer acceptance to day one readiness.",
      generatedAt: new Date().toISOString(),
      content: {
        intro: journeyReading.intro,
        sections: journeyReading.sections,
        keyTakeaways: journeyReading.keyTakeaways,
        timeline
      }
    };
  } else if (sectionKey === "work-culture") {
    const workCultureReading = await buildLearnMoreAiReading({
      context,
      task: {
        key: "workCulture",
        title: "Work Culture",
        description: "Describe work culture for fresh graduates: collaboration style, communication norms, mentorship patterns, review cycles, and work-life rhythm."
      }
    });

    payload = {
      sectionKey,
      title: "Work Culture",
      subtitle: "A practical view of day-to-day culture, expectations, and team dynamics.",
      generatedAt: new Date().toISOString(),
      content: {
        intro: workCultureReading.intro,
        sections: workCultureReading.sections,
        keyTakeaways: workCultureReading.keyTakeaways
      }
    };
  } else if (sectionKey === "locations") {
    const template = await OnboardingTemplate.findById(instance.templateId);
    const knownOfficeLocations = buildKnownOfficeLocations({
      template,
      application,
      companyName: context.companyName
    });
    let locationContent;

    try {
      locationContent = await discoverCompanyLocations(context);
    } catch (_err) {
      locationContent = {
        title: `${context.companyName} Global Locations`,
        intro: `Location data for ${context.companyName} is unavailable at the moment.`,
        locations: [],
        source: "nominatim-fallback"
      };
    }

    const discoveredLocations = Array.isArray(locationContent.locations) ? locationContent.locations : [];
    const mergedLocations = dedupeLocationEntries([...discoveredLocations, ...knownOfficeLocations]);
    const intro = discoveredLocations.length > 0
      ? locationContent.intro
      : mergedLocations.length > 0
        ? `Showing office locations currently available from onboarding details for ${context.companyName}.`
        : locationContent.intro;
    const source = discoveredLocations.length > 0
      ? locationContent.source
      : mergedLocations.length > 0
        ? "onboarding-details"
        : locationContent.source;

    payload = {
      sectionKey,
      title: "Locations",
      subtitle: "Search company presence across countries and cities.",
      generatedAt: new Date().toISOString(),
      content: {
        intro,
        locations: mergedLocations,
        source
      }
    };
  } else {
    const learningReading = await buildLearnMoreAiReading({
      context,
      task: {
        key: "learningGrowth",
        title: "Learning & Growth",
        description: "Generate learning and growth guidance for a new graduate: onboarding learning path, early skill-building goals, mentorship, certifications, and role growth trajectory."
      }
    });

    payload = {
      sectionKey,
      title: "Learning & Growth",
      subtitle: "See your likely learning path, support systems, and growth direction.",
      generatedAt: new Date().toISOString(),
      content: {
        intro: learningReading.intro,
        sections: learningReading.sections,
        keyTakeaways: learningReading.keyTakeaways
      }
    };
  }

  await cachePreJoiningMeta({
    instance,
    step,
    metaPatch: {
      learnMore: {
        ...learnMoreCache,
        [sectionKey]: payload
      }
    }
  });

  return payload;
}

function createOnboardingAccessToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, purpose: "onboarding" },
    process.env.JWT_SECRET,
    { expiresIn: "30m" }
  );
}

module.exports = {
  buildStudentPortalPayload,
  createOnboardingAccessToken,
  getLearnMoreSectionContent,
  getPreJoiningTaskContent,
  getPreJoiningVideoAsset
};
