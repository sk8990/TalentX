import { useState } from "react";
import toast from "react-hot-toast";
import { openProtectedUploadInNewTab, isProtectedUploadPath } from "../utils/protectedFiles";

/**
 * Opens TalentX-upload files via authenticated API. External URLs pass through.
 */
export default function ProtectedUploadLink({
  uploadPath,
  href,
  children,
  className,
  target,
  rel,
  ...rest
}) {
  const pathToUse = uploadPath ?? href;
  const [busy, setBusy] = useState(false);

  const handleClick = async (event) => {
    if (!pathToUse || !isProtectedUploadPath(pathToUse)) return;
    event.preventDefault();
    setBusy(true);
    try {
      await openProtectedUploadInNewTab(pathToUse);
    } catch (err) {
      toast.error(err?.message || "Could not open file");
    } finally {
      setBusy(false);
    }
  };

  if (!pathToUse) return null;

  if (!isProtectedUploadPath(pathToUse)) {
    return (
      <a href={pathToUse} className={className} target={target} rel={rel} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <a
      href="#"
      className={className}
      aria-busy={busy}
      onClick={handleClick}
      {...rest}
    >
      {children}
    </a>
  );
}
