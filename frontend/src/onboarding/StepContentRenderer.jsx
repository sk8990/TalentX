import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";

export default function StepContentRenderer({ activeStep, onBack, children }) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition-all duration-300">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Step View</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">{activeStep?.title}</h2>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-[16px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          <ArrowBackRoundedIcon sx={{ fontSize: 18 }} />
          Back To Dashboard
        </button>
      </div>

      <div className="p-4 sm:p-5 md:p-7 lg:p-8">{children}</div>
    </section>
  );
}
