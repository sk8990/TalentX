const path = require("path");
const fs = require("fs");

const UPLOADS_ROOT = path.join(__dirname, "../uploads");

/**
 * Only allow single-segment filenames produced by multer (no path segments, no traversal).
 */
function assertSafeUploadBasename(value) {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  const base = path.basename(trimmed);
  if (!base || base !== trimmed) return null;
  if (!/^[a-zA-Z0-9._-]+$/.test(base)) return null;
  return base;
}

function isInsideDirectory(filePath, dirPath) {
  const resolvedFile = path.resolve(filePath);
  const resolvedDir = path.resolve(dirPath);
  return resolvedFile === resolvedDir || resolvedFile.startsWith(resolvedDir + path.sep);
}

function resolveRootUploadFile(filename) {
  const safe = assertSafeUploadBasename(filename);
  if (!safe) return null;
  const abs = path.resolve(UPLOADS_ROOT, safe);
  if (!isInsideDirectory(abs, UPLOADS_ROOT)) return null;
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return null;
  return abs;
}

function resolveOnboardingDocumentFile(filename) {
  const safe = assertSafeUploadBasename(filename);
  if (!safe) return null;
  const dir = path.join(UPLOADS_ROOT, "onboarding-documents");
  const abs = path.resolve(dir, safe);
  if (!isInsideDirectory(abs, dir)) return null;
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return null;
  return abs;
}

module.exports = {
  UPLOADS_ROOT,
  assertSafeUploadBasename,
  resolveRootUploadFile,
  resolveOnboardingDocumentFile
};
