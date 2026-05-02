import { useEffect, useState } from "react";
import { buildServerAssetUrl } from "../onboarding/api";
import { fetchProtectedUploadBlob, isProtectedUploadPath } from "../utils/protectedFiles";

/**
 * Renders images whose src may be `/uploads/...` (auth required) or external URLs.
 */
export default function SecureUploadImage({ src, alt, className, onError }) {
  const [blobUrl, setBlobUrl] = useState("");

  useEffect(() => {
    let revoked = null;
    const raw = String(src || "").trim();
    if (!raw) {
      setBlobUrl("");
      return undefined;
    }

    if (!isProtectedUploadPath(raw)) {
      setBlobUrl(buildServerAssetUrl(raw));
      return undefined;
    }

    let cancelled = false;
    fetchProtectedUploadBlob(raw)
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        revoked = url;
        setBlobUrl(url);
      })
      .catch(() => {
        if (!cancelled) setBlobUrl("");
      });

    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [src]);

  if (!blobUrl) {
    return <div className={className ? `${className} bg-slate-100 animate-pulse` : "bg-slate-100 animate-pulse"} aria-hidden />;
  }

  return <img src={blobUrl} alt={alt || ""} className={className} onError={onError} referrerPolicy="origin" />;
}
