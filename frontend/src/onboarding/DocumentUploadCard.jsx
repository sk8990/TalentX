import { useRef, useState } from "react";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import onboardingAPI, { buildServerAssetUrl } from "./api";

const statusConfig = {
  not_uploaded: { label: "Not Uploaded", className: "bg-slate-100 text-slate-600", icon: DescriptionOutlinedIcon },
  uploading: { label: "Uploading", className: "bg-amber-100 text-amber-700", icon: AutorenewRoundedIcon },
  ai_verifying: { label: "AI Verifying", className: "bg-indigo-100 text-indigo-700", icon: AutorenewRoundedIcon },
  verified: { label: "Verified", className: "bg-emerald-100 text-emerald-700", icon: CheckCircleRoundedIcon },
  approved: { label: "Verified", className: "bg-emerald-100 text-emerald-700", icon: CheckCircleRoundedIcon },
  manual_review: { label: "Manual Review", className: "bg-sky-100 text-sky-700", icon: AutorenewRoundedIcon },
  name_mismatch: { label: "Name Mismatch", className: "bg-rose-100 text-rose-700", icon: ErrorOutlineRoundedIcon },
  failed: { label: "Failed", className: "bg-rose-100 text-rose-700", icon: ErrorOutlineRoundedIcon },
  rejected: { label: "Failed", className: "bg-rose-100 text-rose-700", icon: ErrorOutlineRoundedIcon }
};

function getDocumentStatus(document, localStatus) {
  if (localStatus) return localStatus;
  return document?.status || document?.verification?.status || "not_uploaded";
}

export default function DocumentUploadCard({
  documentRequirement,
  uploadedDocument,
  instanceId,
  authToken,
  onDocumentChange
}) {
  const [localStatus, setLocalStatus] = useState("");
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);
  const status = getDocumentStatus(uploadedDocument, localStatus);
  const config = statusConfig[status] || statusConfig.not_uploaded;
  const StatusIcon = config.icon;
  const isBusy = status === "uploading" || status === "ai_verifying";

  const uploadFile = async (file) => {
    if (!file) return;

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      setError("Only PDF, JPG, or PNG files are allowed.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be under 10 MB.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("documentTypeKey", documentRequirement.key);
    formData.append("documentTypeLabel", documentRequirement.label);

    setError("");
    setLocalStatus("uploading");

    try {
      setLocalStatus("ai_verifying");
      const response = await onboardingAPI.post(`/onboarding/${instanceId}/documents`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${authToken}`
        }
      });

      onDocumentChange(documentRequirement.key, response.data?.document || null);
      setLocalStatus("");
    } catch (err) {
      setLocalStatus("");
      setError(err.response?.data?.message || "Upload failed. Please try again.");
    }
  };

  const handleFileInput = (event) => {
    uploadFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const verification = uploadedDocument?.verification || {};
  const showMismatch = status === "name_mismatch" && (verification.expectedName || verification.detectedName);

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-950">{documentRequirement.label}</h3>
            {documentRequirement.required && (
              <span className="rounded bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600">
                Mandatory
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-600">{documentRequirement.description}</p>
        </div>

        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${config.className}`}>
          <StatusIcon sx={{ fontSize: 14 }} className={isBusy ? "animate-spin" : ""} />
          {config.label}
        </span>
      </div>

      <button
        type="button"
        disabled={isBusy}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          if (!isBusy) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          uploadFile(event.dataTransfer.files?.[0]);
        }}
        className={`mt-4 flex min-h-24 w-full flex-col items-center justify-center rounded-lg border border-dashed px-4 py-5 text-center transition ${
          dragOver
            ? "border-indigo-400 bg-indigo-50 text-indigo-700"
            : "border-slate-300 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/60"
        } disabled:cursor-not-allowed disabled:opacity-70`}
      >
        <CloudUploadOutlinedIcon sx={{ fontSize: 28 }} className="text-slate-400" />
        <span className="mt-2 text-sm font-medium">
          {isBusy ? "AI is analyzing uploaded document..." : "Click to upload or drag and drop"}
        </span>
        <span className="mt-1 text-xs text-slate-500">{documentRequirement.accept}</span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={handleFileInput}
        disabled={isBusy}
        className="hidden"
      />

      {uploadedDocument?.originalName && (
        <a
          href={uploadedDocument.url ? buildServerAssetUrl(uploadedDocument.url) : undefined}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-800"
        >
          <DescriptionOutlinedIcon sx={{ fontSize: 16 }} />
          {uploadedDocument.originalName}
        </a>
      )}

      {verification.message && (
        <p className={`mt-3 text-sm ${status === "verified" || status === "approved" ? "text-emerald-700" : "text-slate-600"}`}>
          {status === "verified" || status === "approved"
            ? "Verified Successfully"
            : status === "manual_review"
              ? "Sent for manual review"
              : verification.message}
        </p>
      )}

      {showMismatch && (
        <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          <p>Expected: {verification.expectedName || "Not available"}</p>
          <p>Detected: {verification.detectedName || "Not available"}</p>
        </div>
      )}

      {error && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-rose-600">
          <ErrorOutlineRoundedIcon sx={{ fontSize: 16 }} />
          {error}
        </p>
      )}
    </article>
  );
}
