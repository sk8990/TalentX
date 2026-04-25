import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import FiberManualRecordRoundedIcon from "@mui/icons-material/FiberManualRecordRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import {
  STEP_TYPE_LABELS,
  formatRelativeTime,
  getSidebarStepState,
  getSidebarStepStatusLabel
} from "./constants";

export default function StepIndicator({ step, onSelect, isSelected }) {
  const uiState = getSidebarStepState(step);
  const isCompleted = uiState === "completed";
  const isLocked = uiState === "not-started";
  const isActive = uiState === "in-progress";
  const timestamp = step.completedAt || step.submittedAt || step.startedAt;
  const timeLabel = formatRelativeTime(timestamp);
  const statusLabel = getSidebarStepStatusLabel(step);

  return (
    <button
      type="button"
      onClick={() => !isLocked && onSelect(step.id)}
      disabled={isLocked}
      className={`relative flex w-full items-start gap-3 rounded-[20px] border px-4 py-4 text-left transition ${
        isCompleted
          ? "border-emerald-200 bg-emerald-50/90"
          : isSelected
            ? "border-indigo-300 bg-indigo-50 shadow-[0_0_0_1px_rgba(99,102,241,0.06)]"
            : isLocked
              ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
              : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/50"
      }`}
    >
      <span
        className={`relative z-[1] inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
          isCompleted
            ? "bg-emerald-500 text-white"
            : isActive
              ? "border-[3px] border-amber-500 bg-white text-amber-600"
              : "bg-slate-200 text-slate-500"
        }`}
      >
        {isCompleted ? <CheckCircleRoundedIcon sx={{ fontSize: 18 }} /> : isLocked ? <LockRoundedIcon sx={{ fontSize: 16 }} /> : step.order}
      </span>

      <div className="min-w-0 flex-1">
        <p className={`text-[15px] font-semibold leading-5 ${isLocked ? "text-slate-400" : "text-slate-900"}`}>{step.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
              isCompleted
                ? "text-emerald-600"
                : isActive
                  ? "text-amber-600"
                  : "text-slate-400"
            }`}
          >
            {!isLocked && <FiberManualRecordRoundedIcon sx={{ fontSize: 9 }} />}
            {statusLabel}
          </span>
          {timeLabel && (
            <span className="text-[10px] font-medium text-slate-400">{timeLabel}</span>
          )}
        </div>
        <p className="mt-1 text-xs text-slate-500">{STEP_TYPE_LABELS[step.type] || "Onboarding Step"}</p>
      </div>
    </button>
  );
}
