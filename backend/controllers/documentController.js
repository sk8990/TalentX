const fs = require("fs");
const {
  uploadOnboardingDocument,
  approveDocumentStep,
  rejectDocumentStep,
  buildStudentPortalPayload
} = require("../services/onboarding/service");

exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Document file is required" });
    }

    const payload = await uploadOnboardingDocument({
      userId: req.user.id,
      instanceId: req.body?.instanceId,
      stepId: req.body?.stepId,
      documentType: {
        key: String(req.body?.documentTypeKey || "").trim(),
        label: String(req.body?.documentTypeLabel || "").trim()
      },
      file: req.file
    });

    res.status(201).json(payload);
  } catch (err) {
    // Clean up the saved file if the DB operation failed
    if (req.file?.path) {
      fs.unlink(req.file.path, () => {});
    }
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ message: statusCode < 500 ? err.message : "Internal server error" });
  }
};

exports.approveDocuments = async (req, res) => {
  try {
    const instance = await approveDocumentStep({
      recruiterId: req.user.id,
      instanceId: req.body?.instanceId,
      stepId: req.body?.stepId,
      reviewNotes: req.body?.reviewNotes
    });

    const payload = await buildStudentPortalPayload({
      userId: instance.userId,
      selectedInstanceId: instance._id
    });

    res.json({
      message: "Documents approved successfully",
      onboarding: payload
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ message: statusCode < 500 ? err.message : "Internal server error" });
  }
};

exports.rejectDocuments = async (req, res) => {
  try {
    const instance = await rejectDocumentStep({
      recruiterId: req.user.id,
      instanceId: req.body?.instanceId,
      stepId: req.body?.stepId,
      rejectionReason: req.body?.rejectionReason
    });

    const payload = await buildStudentPortalPayload({
      userId: instance.userId,
      selectedInstanceId: instance._id
    });

    res.json({
      message: "Documents rejected successfully",
      onboarding: payload
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ message: statusCode < 500 ? err.message : "Internal server error" });
  }
};
