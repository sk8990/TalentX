const STEP_STATUSES = [
  "locked",
  "active",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "completed"
];

const ONBOARDING_STATUSES = [
  "not_started",
  "in_progress",
  "ready_for_day_one",
  "completed",
  "declined",
  "archived"
];

const DOCUMENT_STATUSES = [
  "uploaded",
  "ai_verifying",
  "verified",
  "name_mismatch",
  "failed",
  "manual_review",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "superseded"
];

const STEP_TYPES = Object.freeze({
  OFFER_ACCEPTANCE: "offer_acceptance",
  DOCUMENT_COLLECTION: "document_collection",
  PRE_JOINING: "pre_joining",
  DAY_ONE_INFO: "day_one_info"
});

const COMPLETION_STATUSES = new Set(["completed", "approved"]);
const OPEN_STATUSES = new Set(["active", "submitted", "under_review", "rejected"]);
const ACCEPTABLE_VERIFICATION_STATUSES = new Set(["verified", "manual_review", "approved"]);

const STUDENT_ONBOARDING_REQUIRED_DOCUMENTS = [
  {
    key: "tenthMarksheet",
    label: "Class 10th Marksheet",
    description: "Upload your Class Xth Marksheet",
    accept: "PDF, JPG, PNG (max 10MB)",
    required: true
  },
  {
    key: "governmentIdProof",
    label: "Government ID Proof",
    description: "Aadhar Card, PAN Card, or Passport",
    accept: "PDF, JPG, PNG (max 10MB)",
    required: true
  }
];

module.exports = {
  STEP_STATUSES,
  ONBOARDING_STATUSES,
  DOCUMENT_STATUSES,
  STEP_TYPES,
  COMPLETION_STATUSES,
  OPEN_STATUSES,
  ACCEPTABLE_VERIFICATION_STATUSES,
  STUDENT_ONBOARDING_REQUIRED_DOCUMENTS
};
