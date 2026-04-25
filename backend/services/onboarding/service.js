/**
 * Onboarding Service — Public API
 *
 * Re-exports all public functions from the focused sub-modules so that
 * existing imports like `require("./services/onboarding/service")` continue
 * to work without changes to controllers or routes.
 *
 * Sub-modules:
 * - helpers.js          — Shared utilities, status helpers, validation
 * - instanceService.js  — Instance & template provisioning
 * - submissionService.js — Step submissions & document uploads
 * - reviewService.js    — Recruiter approve / reject / review queue
 * - portalService.js    — Student portal payload, pre-joining content, tokens
 * - contentService.js   — AI reading generation, video discovery
 * - defaultTemplate.js  — Default 4-step template definition
 */

const { ensureOnboardingInstancesForStudentUser } = require("./instanceService");
const {
  submitOnboardingStep,
  uploadOnboardingDocument,
  uploadOnboardingDocumentForInstance,
  verifyOnboardingDocument,
  acceptOnboardingOffer
} = require("./submissionService");
const { approveDocumentStep, rejectDocumentStep, getRecruiterReviewQueue, getOnboardingStats } = require("./reviewService");
const {
  buildStudentPortalPayload,
  createOnboardingAccessToken,
  getLearnMoreSectionContent,
  getPreJoiningTaskContent,
  getPreJoiningVideoAsset
} = require("./portalService");

module.exports = {
  buildStudentPortalPayload,
  createOnboardingAccessToken,
  ensureOnboardingInstancesForStudentUser,
  getRecruiterReviewQueue,
  getOnboardingStats,
  getLearnMoreSectionContent,
  getPreJoiningTaskContent,
  getPreJoiningVideoAsset,
  submitOnboardingStep,
  uploadOnboardingDocument,
  uploadOnboardingDocumentForInstance,
  verifyOnboardingDocument,
  acceptOnboardingOffer,
  approveDocumentStep,
  rejectDocumentStep
};
