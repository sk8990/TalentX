/* eslint-disable react-refresh/only-export-components */
export const RECOMMENDATION_OPTIONS = ["STRONG_YES", "YES", "MAYBE", "NO", "STRONG_NO"];

export function getDefaultInterviewerFeedbackForm() {
  return {
    recommendation: "YES",
    ratings: {
      communication: "3",
      technical: "3",
      problemSolving: "3",
      cultureFit: "3"
    },
    notes: ""
  };
}

export default function InterviewerFeedbackForm({
  value,
  onChange,
  onSubmit,
  submitting = false,
  submitLabel = "Submit Feedback",
  title = "Submit Evaluation",
  className = ""
}) {
  const form = value || getDefaultInterviewerFeedbackForm();

  const updateValue = (updater) => {
    if (typeof onChange !== "function") return;
    const nextValue = typeof updater === "function" ? updater(form) : updater;
    onChange(nextValue);
  };

  return (
    <div className={`rounded-2xl border border-slate-200 bg-slate-50 p-4 ${className}`.trim()}>
      <h4 className="text-sm font-semibold text-slate-900">{title}</h4>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Recommendation
          <select
            value={form.recommendation}
            onChange={(event) =>
              updateValue((prev) => ({
                ...prev,
                recommendation: event.target.value
              }))
            }
            className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
          >
            {RECOMMENDATION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>

        {Object.entries(form.ratings || {}).map(([key, fieldValue]) => (
          <label key={key} className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {key}
            <input
              type="text"
              inputMode="numeric"
              pattern="[1-5]"
              value={fieldValue}
              onChange={(event) =>
                updateValue((prev) => ({
                  ...prev,
                  ratings: {
                    ...prev.ratings,
                    [key]: String(event.target.value || "").replace(/[^1-5]/g, "").slice(0, 1)
                  }
                }))
              }
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
              placeholder="1-5"
            />
          </label>
        ))}
      </div>

      <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        Notes
        <textarea
          value={form.notes}
          onChange={(event) =>
            updateValue((prev) => ({
              ...prev,
              notes: event.target.value
            }))
          }
          rows={3}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
          placeholder="Add strengths, gaps, and decision reasoning..."
        />
      </label>

      {typeof onSubmit === "function" ? (
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="mt-3 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Submitting..." : submitLabel}
        </button>
      ) : null}
    </div>
  );
}

export function FeedbackPreview({ feedback }) {
  if (!feedback?.submittedAt) return null;

  return (
    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <h4 className="text-sm font-semibold text-emerald-800">Submitted Evaluation</h4>
      <p className="mt-1 text-xs text-emerald-700">
        Recommendation: {String(feedback.recommendation || "").replaceAll("_", " ")}
      </p>
      <p className="mt-1 text-xs text-emerald-700">
        Ratings - Communication: {feedback.ratings?.communication ?? "-"}, Technical: {feedback.ratings?.technical ?? "-"},
        Problem Solving: {feedback.ratings?.problemSolving ?? "-"}, Culture Fit: {feedback.ratings?.cultureFit ?? "-"}
      </p>
      {feedback.notes ? <p className="mt-2 text-sm text-emerald-900">{feedback.notes}</p> : null}
      <p className="mt-2 text-[11px] text-emerald-700">
        Submitted at {new Date(feedback.submittedAt).toLocaleString()}
      </p>
    </div>
  );
}
