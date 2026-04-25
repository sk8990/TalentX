const mongoose = require("mongoose");
const path = require("path");
const Application = require("../../models/Application");
const OnboardingTemplate = require("../../models/OnboardingTemplate");
const OnboardingInstance = require("../../models/OnboardingInstance");
const OnboardingDocument = require("../../models/Document");
const { buildDefaultTemplateDefinition } = require("./defaultTemplate");
const {
  STEP_TYPES,
  ACCEPTABLE_VERIFICATION_STATUSES,
  STUDENT_ONBOARDING_REQUIRED_DOCUMENTS
} = require("../../constants/onboarding");
const { verifyDocumentName } = require("../documentVerificationService");
const {
  toObjectIdString,
  normalizeCompanyName,
  findStudentForUser,
  findTemplateStep,
  validateRequiredFields,
  createSubmissionWithRetry,
  unlockNextStep,
  recalculateInstanceState
} = require("./helpers");
const {
  ensureOnboardingInstancesForStudentUser,
  findOnboardingInstanceForStudentUser
} = require("./instanceService");

async function findInstanceByStepIdForStudent({ userId, stepId }) {
  const student = await findStudentForUser(userId);
  const instance = await OnboardingInstance.findOne({
    studentId: student._id,
    "steps._id": stepId
  });

  if (!instance) {
    const error = new Error("Onboarding step not found");
    error.statusCode = 404;
    throw error;
  }

  return { student, instance };
}

function serializeVerification(verification = {}) {
  return {
    status: verification.status || "not_uploaded",
    expectedName: verification.expectedName || "",
    detectedName: verification.detectedName || "",
    confidence: Number(verification.confidence || 0),
    message: verification.message || "",
    verifiedAt: verification.verifiedAt || null
  };
}

function serializeDocument(document) {
  return {
    id: document._id,
    status: document.status,
    type: document.documentType,
    originalName: document.storage.originalName,
    url: document.storage.url,
    updatedAt: document.updatedAt,
    verification: serializeVerification(document.verification)
  };
}

function getExpectedStudentName(student) {
  return String(student?.userId?.name || "").trim();
}

function getDocumentStep(instance) {
  return instance.steps.find((candidate) => candidate.type === STEP_TYPES.DOCUMENT_COLLECTION) || null;
}

function normalizeRequiredDocuments() {
  return STUDENT_ONBOARDING_REQUIRED_DOCUMENTS.map((document) => ({ ...document }));
}

function isAllowedDocumentType(documentType) {
  const requiredKeys = new Set(STUDENT_ONBOARDING_REQUIRED_DOCUMENTS.map((document) => document.key));
  return requiredKeys.has(documentType?.key);
}

async function submitOfferAcceptance({ userId, instance, step, payload }) {
  if (!payload?.acceptedTerms) {
    const error = new Error("You must accept the offer terms to continue");
    error.statusCode = 400;
    throw error;
  }

  const application = await Application.findById(instance.applicationId).populate("jobId");
  if (!application?.offer) {
    const error = new Error("Offer not found for this onboarding instance");
    error.statusCode = 404;
    throw error;
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      application.offer.status = "ACCEPTED";
      await application.save({ session });

      const submission = await createSubmissionWithRetry({
        instanceId: instance._id,
        applicationId: instance.applicationId,
        studentId: instance.studentId,
        companyId: instance.companyId || null,
        stepId: step._id,
        stepKey: step.key,
        stepType: step.type,
        status: "completed",
        payload: { acceptedTerms: true },
        submittedAt: new Date(),
        history: [
          {
            status: "completed",
            changedAt: new Date(),
            changedBy: userId,
            note: "Offer accepted by student"
          }
        ]
      }, session);

      step.status = "completed";
      step.completedAt = new Date();
      step.lastSubmissionId = submission._id;
      step.rejectionReason = "";
      step.reviewNotes = "";
      unlockNextStep(instance, step._id);
      recalculateInstanceState(instance);
      await instance.save({ session });
    });
  } finally {
    await session.endSession();
  }
}

async function submitDocumentCollection({ instance, step, payload }) {
  const template = await OnboardingTemplate.findById(instance.templateId);
  const templateStep = findTemplateStep(template, step);
  const formData = payload?.formData || {};
  validateRequiredFields(templateStep, formData);

  const requiredDocuments = normalizeRequiredDocuments();
  const latestDocuments = await OnboardingDocument.find({
    instanceId: instance._id,
    stepId: step._id,
    isLatest: true
  });
  const documentMap = new Map(latestDocuments.map((document) => [document.documentType.key, document]));
  const missingDocumentLabels = [];

  for (const requiredDocument of requiredDocuments) {
    const document = documentMap.get(requiredDocument.key);
    if (!document || !ACCEPTABLE_VERIFICATION_STATUSES.has(document.status)) {
      missingDocumentLabels.push(requiredDocument.label);
    }
  }

  if (missingDocumentLabels.length > 0) {
    const error = new Error(`Please upload all required documents: ${missingDocumentLabels.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }

  const documentIds = latestDocuments.map((document) => document._id);

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const submission = await createSubmissionWithRetry({
        instanceId: instance._id,
        applicationId: instance.applicationId,
        studentId: instance.studentId,
        companyId: instance.companyId || null,
        stepId: step._id,
        stepKey: step.key,
        stepType: step.type,
        status: "under_review",
        payload: { formData },
        documentIds,
        submittedAt: new Date(),
        history: [
          {
            status: "under_review",
            changedAt: new Date(),
            note: "Documents submitted for recruiter review"
          }
        ]
      }, session);

      await OnboardingDocument.updateMany(
        { _id: { $in: documentIds } },
        {
          $set: {
            status: "under_review",
            submissionId: submission._id,
            submissionVersion: submission.version,
            rejectionReason: "",
            reviewerId: null,
            reviewedAt: null
          }
        },
        { session }
      );

      step.status = "under_review";
      step.submittedAt = new Date();
      step.reviewedAt = null;
      step.lastSubmissionId = submission._id;
      step.rejectionReason = "";
      step.reviewNotes = "";
      recalculateInstanceState(instance);
      await instance.save({ session });
    });
  } finally {
    await session.endSession();
  }
}

async function submitPreJoining({ userId, instance, step, payload }) {
  const template = await OnboardingTemplate.findById(instance.templateId);
  const templateStep = findTemplateStep(template, step);
  const tasks = payload?.tasks || {};
  const incompleteTasks = (templateStep?.content?.tasks || [])
    .filter((task) => !tasks[task.key])
    .map((task) => task.title);

  if (incompleteTasks.length > 0) {
    const error = new Error(`Complete all required tasks: ${incompleteTasks.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }

  if (!payload?.acceptedPolicies) {
    const error = new Error("You must accept the company policies to continue");
    error.statusCode = 400;
    throw error;
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const submission = await createSubmissionWithRetry({
        instanceId: instance._id,
        applicationId: instance.applicationId,
        studentId: instance.studentId,
        companyId: instance.companyId || null,
        stepId: step._id,
        stepKey: step.key,
        stepType: step.type,
        status: "completed",
        payload: { tasks, acceptedPolicies: true },
        submittedAt: new Date(),
        history: [
          {
            status: "completed",
            changedAt: new Date(),
            changedBy: userId,
            note: "Pre-joining tasks completed"
          }
        ]
      }, session);

      step.status = "completed";
      step.completedAt = new Date();
      step.lastSubmissionId = submission._id;
      step.rejectionReason = "";
      step.reviewNotes = "";
      unlockNextStep(instance, step._id);
      recalculateInstanceState(instance);
      await instance.save({ session });
    });
  } finally {
    await session.endSession();
  }
}

async function submitOnboardingStep({ userId, stepId, payload }) {
  const { instance } = await findInstanceByStepIdForStudent({ userId, stepId });
  const step = instance.steps.id(stepId);

  if (!step || step.status === "locked") {
    const error = new Error("This step is locked");
    error.statusCode = 400;
    throw error;
  }

  if (step.type === STEP_TYPES.OFFER_ACCEPTANCE) {
    await submitOfferAcceptance({ userId, instance, step, payload });
  } else if (step.type === STEP_TYPES.DOCUMENT_COLLECTION) {
    await submitDocumentCollection({ instance, step, payload });
  } else if (step.type === STEP_TYPES.PRE_JOINING) {
    await submitPreJoining({ userId, instance, step, payload });
  } else {
    const error = new Error("This step does not accept submissions");
    error.statusCode = 400;
    throw error;
  }

  // Lazy import to avoid circular dependency
  const { buildStudentPortalPayload } = require("./portalService");
  return buildStudentPortalPayload({ userId, selectedInstanceId: instance._id });
}

async function uploadOnboardingDocument({ userId, instanceId, stepId, documentType, file }) {
  const student = await findStudentForUser(userId);
  const instance = await OnboardingInstance.findOne({
    _id: instanceId,
    studentId: student._id
  });

  if (!instance) {
    const error = new Error("Onboarding instance not found");
    error.statusCode = 404;
    throw error;
  }

  const step = instance.steps.id(stepId);
  if (!step || step.type !== STEP_TYPES.DOCUMENT_COLLECTION) {
    const error = new Error("Document uploads are only allowed for the document submission step");
    error.statusCode = 400;
    throw error;
  }

  if (!documentType?.key || !documentType?.label) {
    const error = new Error("Document type is required");
    error.statusCode = 400;
    throw error;
  }

  if (!isAllowedDocumentType(documentType)) {
    const error = new Error("Unsupported onboarding document type");
    error.statusCode = 400;
    throw error;
  }

  const expectedName = getExpectedStudentName(student);
  const verification = await verifyDocumentName({
    filePath: file.path,
    expectedName,
    documentType: documentType.label,
    userId,
    applicationId: instance.applicationId,
    companyId: instance.companyId || null
  });

  await OnboardingDocument.updateMany(
    {
      instanceId: instance._id,
      stepId: step._id,
      "documentType.key": documentType.key,
      isLatest: true
    },
    {
      $set: {
        isLatest: false,
        status: "superseded"
      }
    }
  );

  const relativeUrl = `/uploads/onboarding-documents/${file.filename}`;
  const document = await OnboardingDocument.create({
    instanceId: instance._id,
    applicationId: instance.applicationId,
    studentId: student._id,
    companyId: instance.companyId || null,
    stepId: step._id,
    stepKey: step.key,
    documentType,
    storage: {
      fileName: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: relativeUrl
    },
    verification: {
      ...verification,
      verifiedAt: new Date()
    },
    status: verification.status,
    isLatest: true
  });

  return {
    document: serializeDocument(document)
  };
}

async function uploadOnboardingDocumentForInstance({ userId, identifier, documentType, file }) {
  const { instance } = await findOnboardingInstanceForStudentUser({ userId, identifier });
  const step = getDocumentStep(instance);

  if (!step) {
    const error = new Error("Document submission step not found");
    error.statusCode = 404;
    throw error;
  }

  return uploadOnboardingDocument({
    userId,
    instanceId: instance._id,
    stepId: step._id,
    documentType,
    file
  });
}

async function verifyOnboardingDocument({ userId, identifier, documentId }) {
  const { student, instance } = await findOnboardingInstanceForStudentUser({ userId, identifier });
  const document = await OnboardingDocument.findOne({
    _id: documentId,
    instanceId: instance._id,
    studentId: student._id,
    isLatest: true
  });

  if (!document) {
    const error = new Error("Document not found");
    error.statusCode = 404;
    throw error;
  }

  const uploadRoot = path.resolve(__dirname, "../../uploads/onboarding-documents");
  const absoluteFilePath = path.resolve(uploadRoot, document.storage.fileName);
  const relativeFilePath = path.relative(uploadRoot, absoluteFilePath);

  if (relativeFilePath.startsWith("..") || path.isAbsolute(relativeFilePath)) {
    const error = new Error("Invalid document storage path");
    error.statusCode = 400;
    throw error;
  }

  const verification = await verifyDocumentName({
    filePath: absoluteFilePath,
    expectedName: getExpectedStudentName(student),
    documentType: document.documentType.label,
    userId,
    applicationId: instance.applicationId,
    companyId: instance.companyId || null
  });

  document.verification = {
    ...verification,
    verifiedAt: new Date()
  };
  document.status = verification.status;
  document.rejectionReason = verification.status === "name_mismatch" ? verification.message : "";
  await document.save();

  return { document: serializeDocument(document) };
}

async function getLatestRequiredDocuments(instance) {
  const documentStep = getDocumentStep(instance);
  if (!documentStep) {
    const error = new Error("Document submission step not found");
    error.statusCode = 404;
    throw error;
  }

  const documents = await OnboardingDocument.find({
    instanceId: instance._id,
    stepId: documentStep._id,
    "documentType.key": { $in: STUDENT_ONBOARDING_REQUIRED_DOCUMENTS.map((document) => document.key) },
    isLatest: true
  }).sort({ updatedAt: -1 });

  const documentMap = new Map(documents.map((document) => [document.documentType.key, document]));
  const missingOrInvalid = [];

  for (const requiredDocument of STUDENT_ONBOARDING_REQUIRED_DOCUMENTS) {
    const document = documentMap.get(requiredDocument.key);
    if (!document || !ACCEPTABLE_VERIFICATION_STATUSES.has(document.status)) {
      missingOrInvalid.push(requiredDocument.label);
    }
  }

  return {
    documentStep,
    documents,
    documentMap,
    missingOrInvalid
  };
}

async function acceptOnboardingOffer({ userId, identifier }) {
  const { instance } = await findOnboardingInstanceForStudentUser({ userId, identifier });
  const application = await Application.findById(instance.applicationId).populate("jobId");

  if (!application?.offer) {
    const error = new Error("Offer not found for this onboarding instance");
    error.statusCode = 404;
    throw error;
  }

  if (String(application.offer.status || "").toUpperCase() === "ACCEPTED") {
    const { buildStudentPortalPayload } = require("./portalService");
    return buildStudentPortalPayload({ userId, selectedInstanceId: instance._id });
  }

  const offerStep = instance.steps.find((candidate) => candidate.type === STEP_TYPES.OFFER_ACCEPTANCE);
  const { documentStep, documents, missingOrInvalid } = await getLatestRequiredDocuments(instance);

  if (!offerStep) {
    const error = new Error("Offer acceptance step not found");
    error.statusCode = 404;
    throw error;
  }

  if (missingOrInvalid.length > 0) {
    const error = new Error(`Please upload and verify all mandatory documents: ${missingOrInvalid.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }

  const documentIds = documents.map((document) => document._id);
  const hasManualReview = documents.some((document) => document.status === "manual_review");
  const documentStepStatus = hasManualReview ? "under_review" : "completed";

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      application.offer.status = "ACCEPTED";
      application.offer.acceptedAt = new Date();
      await application.save({ session });

      const offerSubmission = await createSubmissionWithRetry({
        instanceId: instance._id,
        applicationId: instance.applicationId,
        studentId: instance.studentId,
        companyId: instance.companyId || null,
        stepId: offerStep._id,
        stepKey: offerStep.key,
        stepType: offerStep.type,
        status: "completed",
        payload: { acceptedTerms: true, acceptedVia: "multi_company_onboarding_flow" },
        submittedAt: new Date(),
        history: [
          {
            status: "completed",
            changedAt: new Date(),
            changedBy: userId,
            note: "Offer accepted by student after document verification"
          }
        ]
      }, session);

      offerStep.status = "completed";
      offerStep.completedAt = new Date();
      offerStep.lastSubmissionId = offerSubmission._id;
      offerStep.rejectionReason = "";
      offerStep.reviewNotes = "";

      const documentSubmission = await createSubmissionWithRetry({
        instanceId: instance._id,
        applicationId: instance.applicationId,
        studentId: instance.studentId,
        companyId: instance.companyId || null,
        stepId: documentStep._id,
        stepKey: documentStep.key,
        stepType: documentStep.type,
        status: documentStepStatus,
        payload: {
          verificationStatus: hasManualReview ? "manual_review" : "verified",
          requiredDocuments: documents.map((document) => ({
            key: document.documentType.key,
            label: document.documentType.label,
            status: document.status,
            verification: serializeVerification(document.verification)
          }))
        },
        documentIds,
        submittedAt: new Date(),
        history: [
          {
            status: documentStepStatus,
            changedAt: new Date(),
            changedBy: userId,
            note: hasManualReview
              ? "Documents sent for manual review after AI-assisted verification"
              : "Documents verified by AI-assisted verification"
          }
        ]
      }, session);

      await OnboardingDocument.updateMany(
        { _id: { $in: documentIds } },
        {
          $set: {
            submissionId: documentSubmission._id,
            submissionVersion: documentSubmission.version,
            rejectionReason: ""
          }
        },
        { session }
      );

      documentStep.status = documentStepStatus;
      documentStep.submittedAt = new Date();
      documentStep.lastSubmissionId = documentSubmission._id;
      documentStep.rejectionReason = "";
      documentStep.reviewNotes = "";

      if (documentStepStatus === "completed") {
        documentStep.completedAt = new Date();
        unlockNextStep(instance, documentStep._id);
      } else {
        documentStep.reviewedAt = null;
      }

      recalculateInstanceState(instance);
      await instance.save({ session });
    });
  } finally {
    await session.endSession();
  }

  const { buildStudentPortalPayload } = require("./portalService");
  return buildStudentPortalPayload({ userId, selectedInstanceId: instance._id });
}

module.exports = {
  submitOnboardingStep,
  uploadOnboardingDocument,
  uploadOnboardingDocumentForInstance,
  verifyOnboardingDocument,
  acceptOnboardingOffer
};
