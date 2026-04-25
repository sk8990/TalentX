import { useCallback, useRef, useState } from "react";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import onboardingAPI, { buildServerAssetUrl } from "./api";

// Phase 4.3: Real drag-and-drop support for document uploads
export default function UploadCard({ doc, instanceId, stepId, authToken, onUploaded, disabled }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = useCallback(async (file) => {
    if (!file || disabled) return;

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      setError("Only PDF, JPG, or PNG files are allowed");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be under 5 MB");
      return;
    }

    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("instanceId", instanceId);
    formData.append("stepId", stepId);
    formData.append("documentTypeKey", doc.key);
    formData.append("documentTypeLabel", doc.label);

    try {
      const response = await onboardingAPI.post("/documents/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (onUploaded) {
        onUploaded(doc.key, response.data?.document);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [doc, instanceId, stepId, authToken, disabled, onUploaded]);

  const handleInputChange = (event) => {
    const file = event.target.files?.[0];
    if (file) handleFile(file);
    event.target.value = "";
  };

  // Drag-and-drop handlers
  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!disabled && !uploading) setIsDragOver(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  };

  const uploadedDoc = doc.document;
  const isRejected = uploadedDoc?.status === "rejected";

  return (
    <div
      className={`rounded-[22px] border p-5 transition-colors ${
        isDragOver
          ? "border-indigo-400 bg-indigo-50/70 shadow-[0_0_0_2px_rgba(99,102,241,0.15)]"
          : isRejected
            ? "border-rose-300 bg-rose-50/40"
            : uploadedDoc
              ? "border-emerald-200 bg-emerald-50/50"
              : "border-dashed border-slate-300 bg-slate-50/60"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">{doc.label}</p>
          {doc.description && <p className="mt-1 text-xs text-slate-500">{doc.description}</p>}

          {isRejected && uploadedDoc.rejectionReason && (
            <div className="mt-2 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              <ErrorOutlineRoundedIcon sx={{ fontSize: 14, marginTop: "2px" }} />
              <span>{uploadedDoc.rejectionReason}</span>
            </div>
          )}
        </div>

        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ${
          uploadedDoc ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-500"
        }`}>
          {uploadedDoc ? <CheckCircleRoundedIcon sx={{ fontSize: 16 }} /> : <DescriptionRoundedIcon sx={{ fontSize: 16 }} />}
        </span>
      </div>

      {uploadedDoc && (
        <a
          href={buildServerAssetUrl(uploadedDoc.url)}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
        >
          <DescriptionRoundedIcon sx={{ fontSize: 14 }} />
          {uploadedDoc.originalName}
        </a>
      )}

      <div className="mt-3">
        <input
          type="file"
          ref={fileInputRef}
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled || uploading}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="flex w-full items-center justify-center gap-2 rounded-[16px] border border-dashed border-slate-300 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <CloudUploadRoundedIcon sx={{ fontSize: 18 }} />
          {uploading ? "Uploading..." : isDragOver ? "Drop file here" : uploadedDoc ? "Replace File" : "Drag & drop or click to upload"}
        </button>
      </div>

      {error && (
        <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-rose-600">
          <ErrorOutlineRoundedIcon sx={{ fontSize: 13 }} />
          {error}
        </p>
      )}
    </div>
  );
}
