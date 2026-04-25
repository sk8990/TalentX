export const STEP_TYPE_LABELS = {
  offer_acceptance: "Offer Acceptance",
  document_collection: "Document Submission",
  pre_joining: "Pre-Joining Formalities",
  day_one_info: "Day 1 Details",
};

export const statusBannerStyles = {
  info: "border-slate-200 bg-slate-50 text-slate-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-rose-200 bg-rose-50 text-rose-800",
};

export function getInitials(name) {
  const parts = String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) return "TX";
  return parts.map((part) => part[0]?.toUpperCase() || "").join("");
}

export function readStepFormValues(step) {
  const nextState = {};
  for (const section of step?.content?.sections || []) {
    for (const field of section.fields || []) {
      nextState[field.key] = field.value || "";
    }
  }
  return nextState;
}

export function buildPortalSearch(instanceId) {
  return instanceId ? `?instanceId=${instanceId}` : "";
}

export function buildOverallStatusLabel(status) {
  if (status === "ready_for_day_one") return "Ready For Day 1";
  if (status === "completed") return "Onboarding Completed";
  return "Onboarding in Progress";
}

export function getSidebarStepState(step) {
  const status = String(step?.status || "").trim();

  if (status === "completed" || status === "approved") {
    return "completed";
  }

  if (status === "locked") {
    return "not-started";
  }

  return "in-progress";
}

export function getSidebarStepStatusLabel(step) {
  const status = String(step?.status || "").trim();

  if (status === "completed" || status === "approved") {
    return "Completed";
  }

  if (status === "locked") {
    return "Not Started";
  }

  return "In Progress";
}

export const DASHBOARD_CARD_CONFIG = [
  {
    key: "onboarding-journey",
    title: "Onboarding Journey",
    badge: "01",
    stepType: "offer_acceptance",
    summary: "Understand your complete journey from offer acceptance to first day readiness.",
    sectionHint: "See the full journey",
    imageUrl: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80",
    accentClassName: "from-indigo-700 via-indigo-600 to-sky-500",
    glowClassName: "bg-white/20",
    iconName: "flow"
  },
  {
    key: "work-culture",
    title: "Work Culture",
    badge: "02",
    stepType: "pre_joining",
    summary: "Explore team culture, communication style, and expected work rhythm.",
    sectionHint: "Know how work happens",
    imageUrl: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1200&q=80",
    accentClassName: "from-slate-900 via-slate-800 to-indigo-700",
    glowClassName: "bg-amber-300/20",
    iconName: "policy"
  },
  {
    key: "locations",
    title: "Locations",
    badge: "03",
    stepType: "day_one_info",
    summary: "Search where the company operates globally with country-wise filtering.",
    sectionHint: "Find global presence",
    imageUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
    accentClassName: "from-sky-700 via-cyan-600 to-indigo-600",
    glowClassName: "bg-white/20",
    iconName: "location"
  },
  {
    key: "learning-growth",
    title: "Learning & Growth",
    badge: "04",
    stepType: "pre_joining",
    summary: "View role-focused learning paths, growth opportunities, and skill priorities.",
    sectionHint: "Plan your growth",
    imageUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=80",
    accentClassName: "from-violet-700 via-fuchsia-600 to-pink-500",
    glowClassName: "bg-white/15",
    iconName: "learning"
  }
];

// Phase 4.2: Relative time formatter for step timestamps
export function formatRelativeTime(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
