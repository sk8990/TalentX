import CheckRoundedIcon from "@mui/icons-material/CheckRounded";

const steps = [
  "Official Letter",
  "Documents for verification",
  "Accept Offer"
];

export default function OnboardingStepper({ activeStep }) {
  return (
    <div className="border-b border-slate-200 bg-white px-3 py-3 sm:px-4 sm:py-4">
      <div className="mx-auto flex max-w-4xl items-start justify-between gap-1 sm:gap-0">
        {steps.map((label, index) => {
          const isCompleted = index < activeStep;
          const isActive = index === activeStep;

          return (
            <div key={label} className="flex flex-1 items-start">
              <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
                <span
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition ${
                    isCompleted
                      ? "bg-emerald-500 text-white"
                      : isActive
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {isCompleted ? <CheckRoundedIcon sx={{ fontSize: 18 }} /> : index + 1}
                </span>
                <span className={`text-xs ${isActive ? "font-semibold text-slate-950" : "text-slate-600"}`}>
                  {label}
                </span>
              </div>

              {index < steps.length - 1 && (
                <div
                  className={`mt-[17px] h-0.5 w-full max-w-36 rounded-full ${
                    isCompleted ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
