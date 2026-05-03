import TalentXBrand from "./TalentXBrand";

const patternStyle = {
  backgroundImage: [
    "linear-gradient(150deg, transparent 0 43%, rgba(36,59,149,0.08) 43.5% 44.5%, transparent 45% 100%)",
    "linear-gradient(30deg, transparent 0 58%, rgba(49,77,184,0.07) 58.5% 59.5%, transparent 60% 100%)",
    "linear-gradient(90deg, transparent 0 47%, rgba(36,59,149,0.05) 47.5% 48%, transparent 48.5% 100%)",
  ].join(", "),
  backgroundPosition: "0 0, 80px 52px, 160px 0",
  backgroundSize: "420px 280px",
};

export default function ScreenLoader({
  message = "Loading...",
  subtext = "",
  fullScreen = false,
  showBrand = false,
  className = "",
}) {
  return (
    <div
      className={`relative isolate flex items-center justify-center overflow-hidden bg-white px-4 dark:bg-slate-950 ${
        fullScreen ? "fixed inset-0 z-[9999] min-h-[100dvh]" : "min-h-[60vh] rounded-2xl"
      } ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="absolute inset-0 opacity-90" style={patternStyle} aria-hidden="true" />
      <div className="absolute inset-0 bg-white/80 dark:bg-slate-950/80" aria-hidden="true" />

      <div className="relative flex flex-col items-center text-center">
        {showBrand && (
          <div className="mb-8 rounded-2xl bg-[#eef3ff] px-4 py-3 text-[#243b95] shadow-sm">
            <TalentXBrand theme="light" size="sm" />
          </div>
        )}

        <div className="relative h-14 w-14">
          <div className="absolute inset-0 rounded-full border-[5px] border-slate-200" />
          <div className="absolute inset-0 animate-spin rounded-full border-[5px] border-transparent border-t-[#2196f3] border-r-[#2196f3]" />
        </div>

        {message && (
          <p className="mt-6 text-sm font-bold text-slate-900 dark:text-slate-100 sm:text-base">{message}</p>
        )}
        {subtext && (
          <p className="mt-2 max-w-sm text-xs leading-6 text-slate-500 dark:text-slate-400 sm:text-sm">{subtext}</p>
        )}
      </div>
    </div>
  );
}
