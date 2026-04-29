export function formatCurrencyInrPaisa(value) {
  const amountInPaisa = Number(value || 0);
  const amountInRupees = amountInPaisa / 100;

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(amountInRupees);
}

export function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function formatPlanLabel(planKey) {
  if (!planKey) {
    return "-";
  }

  return String(planKey)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function statusToneClass(status) {
  const normalized = String(status || "").toLowerCase();

  if (["active", "paid", "success", "enabled", "free", "visible", "approved"].includes(normalized)) {
    return "tx-status-success";
  }

  if (["failed", "cancelled", "canceled", "disabled", "refunded", "expired", "hidden", "rejected"].includes(normalized)) {
    return "tx-status-danger";
  }

  if (["created", "pending"].includes(normalized)) {
    return "tx-status-warning";
  }

  return "tx-status-muted";
}

export function Pagination({ page, totalPages, onPageChange }) {
  const safePage = Math.max(1, Number(page || 1));
  const safeTotalPages = Math.max(1, Number(totalPages || 1));

  return (
    <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, safePage - 1))}
        disabled={safePage <= 1}
        className="tx-button-secondary px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
      >
        Previous
      </button>

      <p className="text-xs text-slate-500 sm:text-sm">
        Page {safePage} of {safeTotalPages}
      </p>

      <button
        type="button"
        onClick={() => onPageChange(Math.min(safeTotalPages, safePage + 1))}
        disabled={safePage >= safeTotalPages}
        className="tx-button-secondary px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
      >
        Next
      </button>
    </div>
  );
}
