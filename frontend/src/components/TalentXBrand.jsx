export const TALENTX_TAGLINE = "TalentX - An AI powered Campus Hiring Platform";

const sizeMap = {
  sm: {
    wrapper: "gap-2.5",
    mark: "h-10 w-10 rounded-xl",
    primaryBar: "h-5 w-2",
    secondaryBar: "h-5 w-2",
    accentBar: "h-2 w-5",
    text: "text-sm",
  },
  md: {
    wrapper: "gap-3",
    mark: "h-12 w-12 rounded-2xl",
    primaryBar: "h-7 w-2",
    secondaryBar: "h-7 w-2",
    accentBar: "h-2 w-7",
    text: "text-base",
  },
  lg: {
    wrapper: "gap-3.5",
    mark: "h-14 w-14 rounded-2xl",
    primaryBar: "h-8 w-2.5",
    secondaryBar: "h-8 w-2.5",
    accentBar: "h-2.5 w-8",
    text: "text-lg",
  },
};

const themeMap = {
  light: {
    markShell: "border-indigo-100 bg-indigo-50",
    primary: "bg-indigo-600",
    secondary: "bg-sky-500",
    accent: "bg-indigo-500",
    emphasis: "text-slate-950",
    text: "text-slate-500",
  },
  dark: {
    markShell: "border-white/15 bg-white/10",
    primary: "bg-white",
    secondary: "bg-white/70",
    accent: "bg-white/85",
    emphasis: "text-white",
    text: "text-slate-200",
  },
  muted: {
    markShell: "border-white/10 bg-white/5",
    primary: "bg-white/85",
    secondary: "bg-white/55",
    accent: "bg-white/70",
    emphasis: "text-white",
    text: "text-slate-300",
  },
};

export function TalentXMark({ theme = "light", size = "md", className = "" }) {
  const palette = themeMap[theme] || themeMap.light;
  const scale = sizeMap[size] || sizeMap.md;

  return (
    <span
      className={`relative inline-flex items-center justify-center border ${scale.mark} ${palette.markShell} ${className}`.trim()}
      aria-hidden="true"
    >
      <span className={`absolute -rotate-45 rounded-full ${scale.primaryBar} ${palette.primary}`} />
      <span className={`absolute rotate-45 rounded-full ${scale.secondaryBar} ${palette.secondary}`} />
      <span className={`absolute rounded-full ${scale.accentBar} ${palette.accent}`} />
    </span>
  );
}

export default function TalentXBrand({
  theme = "light",
  size = "md",
  className = "",
  textClassName = "",
  emphasisClassName = "",
}) {
  const palette = themeMap[theme] || themeMap.light;
  const scale = sizeMap[size] || sizeMap.md;

  return (
    <div className={`flex items-center ${scale.wrapper} ${className}`.trim()}>
      <TalentXMark theme={theme} size={size} />
      <p className={`max-w-full text-balance font-medium leading-snug ${scale.text} ${palette.text} ${textClassName}`.trim()}>
        <span className={`font-black ${palette.emphasis} ${emphasisClassName}`.trim()}>TalentX</span>
        <span className="hidden sm:inline">{` - An AI powered Campus Hiring Platform`}</span>
      </p>
    </div>
  );
}
