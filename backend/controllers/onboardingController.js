const mongoose = require("mongoose");
const {
  buildStudentPortalPayload,
  createOnboardingAccessToken,
  ensureOnboardingInstancesForStudentUser,
  getRecruiterReviewQueue,
  getOnboardingStats,
  getLearnMoreSectionContent,
  getPreJoiningTaskContent,
  getPreJoiningVideoAsset,
  submitOnboardingStep,
  uploadOnboardingDocumentForInstance,
  verifyOnboardingDocument,
  acceptOnboardingOffer
} = require("../services/onboarding/service");
const { checkStudentLimit } = require("../helpers/studentAccessHelper");

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

exports.initOnboarding = async (req, res) => {
  try {
    const { instances } = await ensureOnboardingInstancesForStudentUser(req.user.id);

    if (!instances.length) {
      return res.status(404).json({
        message: "No onboarding workflow is available for this student yet"
      });
    }

    const requestedInstanceId = String(req.body?.instanceId || "").trim();
    const selectedInstance = requestedInstanceId
      ? instances.find((instance) => String(instance._id) === requestedInstanceId)
      : null;

    const token = createOnboardingAccessToken(req.user);
    const searchParams = new URLSearchParams();

    if (selectedInstance?._id) {
      searchParams.set("instanceId", String(selectedInstance._id));
    }

    res.json({
      token,
      redirectUrl: `/onboarding?${searchParams.toString()}`
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ message: statusCode < 500 ? err.message : "Internal server error" });
  }
};

exports.getOnboardingPortal = async (req, res) => {
  try {
    if (req.user.role === "recruiter" && String(req.query?.view || "").trim() === "review") {
      const payload = await getRecruiterReviewQueue(req.user.id);
      return res.json(payload);
    }

    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only students can access the onboarding portal" });
    }

    const limitCheck = await checkStudentLimit(req.user, "onboarding");
    if (!limitCheck.allowed) {
      return res.status(403).json({
        message: "Onboarding access is available only for verified Enterprise college students."
      });
    }

    const payload = await buildStudentPortalPayload({
      userId: req.user.id,
      selectedInstanceId: req.query?.instanceId
    });

    res.json(payload);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ message: statusCode < 500 ? err.message : "Internal server error" });
  }
};

exports.getOnboardingCompanies = async (req, res) => {
  try {
    const payload = await buildStudentPortalPayload({
      userId: req.user.id,
      selectedInstanceId: null
    });

    res.json({
      mode: payload.mode === "empty" ? "empty" : "selector",
      user: payload.user,
      companies: payload.companies || [],
      selectedInstance: null
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ message: statusCode < 500 ? err.message : "Internal server error" });
  }
};

exports.getOnboardingDetails = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.companyOrApplicationId)) {
      return res.status(400).json({ message: "Invalid onboarding identifier format" });
    }

    const payload = await buildStudentPortalPayload({
      userId: req.user.id,
      selectedInstanceId: req.params.companyOrApplicationId
    });

    res.json(payload);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ message: statusCode < 500 ? err.message : "Internal server error" });
  }
};

exports.uploadOnboardingDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Document file is required" });
    }

    const payload = await uploadOnboardingDocumentForInstance({
      userId: req.user.id,
      identifier: req.params.companyOrApplicationId,
      documentType: {
        key: String(req.body?.documentTypeKey || "").trim(),
        label: String(req.body?.documentTypeLabel || "").trim()
      },
      file: req.file
    });

    res.status(201).json(payload);
  } catch (err) {
    if (req.file?.path) {
      require("fs").unlink(req.file.path, () => {});
    }
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ message: statusCode < 500 ? err.message : "Internal server error" });
  }
};

exports.verifyOnboardingDocument = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.companyOrApplicationId) || !isValidObjectId(req.params.documentId)) {
      return res.status(400).json({ message: "Invalid onboarding or document identifier format" });
    }

    const payload = await verifyOnboardingDocument({
      userId: req.user.id,
      identifier: req.params.companyOrApplicationId,
      documentId: req.params.documentId
    });

    res.json(payload);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ message: statusCode < 500 ? err.message : "Internal server error" });
  }
};

exports.acceptOffer = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.companyOrApplicationId)) {
      return res.status(400).json({ message: "Invalid onboarding identifier format" });
    }

    const payload = await acceptOnboardingOffer({
      userId: req.user.id,
      identifier: req.params.companyOrApplicationId
    });

    res.json({
      message: "Offer accepted successfully. Welcome to your onboarding journey.",
      onboarding: payload
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ message: statusCode < 500 ? err.message : "Internal server error" });
  }
};

exports.submitStep = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid step ID format" });
    }

    const payload = await submitOnboardingStep({
      userId: req.user.id,
      stepId: req.params.id,
      payload: req.body || {}
    });

    res.json(payload);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ message: statusCode < 500 ? err.message : "Internal server error" });
  }
};

exports.getPreJoiningReading = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.instanceId)) {
      return res.status(400).json({ message: "Invalid instance ID format" });
    }

    const reading = await getPreJoiningTaskContent({
      userId: req.user.id,
      instanceId: req.params.instanceId,
      taskKey: req.params.taskKey
    });

    res.json({ reading });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ message: statusCode < 500 ? err.message : "Internal server error" });
  }
};

exports.getPreJoiningVideo = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.instanceId)) {
      return res.status(400).json({ message: "Invalid instance ID format" });
    }

    const video = await getPreJoiningVideoAsset({
      userId: req.user.id,
      instanceId: req.params.instanceId
    });

    res.json({ video });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ message: statusCode < 500 ? err.message : "Internal server error" });
  }
};

exports.getLearnMoreSection = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.instanceId)) {
      return res.status(400).json({ message: "Invalid instance ID format" });
    }

    const payload = await getLearnMoreSectionContent({
      userId: req.user.id,
      instanceId: req.params.instanceId,
      sectionKey: req.params.sectionKey
    });

    res.json(payload);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ message: statusCode < 500 ? err.message : "Internal server error" });
  }
};

exports.getStats = async (req, res) => {
  try {
    const stats = await getOnboardingStats(req.user.id);
    res.json(stats);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ message: statusCode < 500 ? err.message : "Internal server error" });
  }
};
