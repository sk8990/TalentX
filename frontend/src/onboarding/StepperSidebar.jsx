import StepIndicator from "./StepIndicator";
import { buildOverallStatusLabel } from "./constants";

export default function StepperSidebar({
  steps,
  activeStepId,
  completedCount,
  totalCount,
  deadline,
  instanceStatus,
  onSelectStep
}) {
  const statusLabel = buildOverallStatusLabel(instanceStatus);

  return (
    <aside className="w-full shrink-0 lg:max-w-[295px]">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:rounded-[26px]">
        <div className="bg-[linear-gradient(90deg,#243b95_0%,#314db8_100%)] px-5 py-4 text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-100">{statusLabel}</p>
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-slate-950">Onboarding Tracker</h2>
              <p className="mt-1 text-sm text-slate-500">
                {completedCount}/{totalCount} steps completed
              </p>
            </div>
            {deadline && (
              <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-600">
                Due {new Date(deadline).toLocaleDateString()}
              </span>
            )}
          </div>

          <div className="mt-4 h-2 rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all duration-300"
              style={{ width: `${totalCount ? (completedCount / totalCount) * 100 : 0}%` }}
            />
          </div>

          <div className="relative mt-6 space-y-3 before:absolute before:bottom-4 before:left-[19px] before:top-4 before:w-px before:bg-slate-200">
            {steps.map((step) => (
              <StepIndicator
                key={step.id}
                step={step}
                isSelected={step.id === activeStepId}
                onSelect={onSelectStep}
              />
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
