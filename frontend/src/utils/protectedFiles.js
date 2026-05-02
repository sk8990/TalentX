import axios from "../api/axios";

/** Strip origin so `http://host/uploads/x` → `/uploads/x`; leave other URLs unchanged. */
export function normalizeToUploadRelative(storedPath) {
  const raw = String(storedPath || "").trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  const idx = lower.indexOf("/uploads/");
  if (idx >= 0) {
    const relative = raw.slice(idx);
    return relative.startsWith("/") ? relative : `/${relative}`;
  }
  return raw;
}

/**
 * Maps stored paths like `/uploads/foo.pdf` or `uploads/onboarding-documents/bar.pdf`
 * to authenticated API routes under `/api/files/`.
 */
export function mapUploadPathToApiRelative(storedPath) {
  const normalized = normalizeToUploadRelative(storedPath);
  if (!normalized.toLowerCase().startsWith("/uploads/")) return null;
  const rest = normalized.slice("/uploads/".length);
  const segments = rest.split("/").filter(Boolean);
  if (segments.length === 1) return `/files/root/${segments[0]}`;
  if (segments.length === 2 && segments[0] === "onboarding-documents") {
    return `/files/onboarding-documents/${segments[1]}`;
  }
  return null;
}

export function isProtectedUploadPath(storedPath) {
  return mapUploadPathToApiRelative(storedPath) != null;
}

export async function fetchProtectedUploadBlob(storedPath) {
  const apiRel = mapUploadPathToApiRelative(storedPath);
  if (!apiRel) {
    throw new Error("Unsupported or invalid upload path");
  }
  const response = await axios.get(apiRel, { responseType: "blob" });
  return response.data;
}

export async function openProtectedUploadInNewTab(storedPath) {
  const blob = await fetchProtectedUploadBlob(storedPath);
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (!win) {
    URL.revokeObjectURL(url);
    throw new Error("Popup blocked — allow popups to view this file.");
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
}
