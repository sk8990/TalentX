import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import MapOutlinedIcon from "@mui/icons-material/MapOutlined";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import { DASHBOARD_CARD_CONFIG } from "./constants";

function CardHeroIcon({ iconName }) {
  if (iconName === "policy") {
    return <DescriptionRoundedIcon sx={{ fontSize: 36 }} />;
  }
  if (iconName === "location") {
    return <MapOutlinedIcon sx={{ fontSize: 36 }} />;
  }
  if (iconName === "learning") {
    return <SchoolRoundedIcon sx={{ fontSize: 36 }} />;
  }
  return <AutoAwesomeRoundedIcon sx={{ fontSize: 36 }} />;
}

function buildDashboardCards() {
  return DASHBOARD_CARD_CONFIG.map((card) => ({
    ...card,
    statusLabel: "Learn More"
  }));
}

export default function DashboardCards({ activeCardKey, onOpenCard, onBackToDashboard }) {
  const cards = buildDashboardCards();

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="bg-[linear-gradient(90deg,#243b95_0%,#314db8_100%)] px-6 py-4 text-white">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10">
              <AutoAwesomeRoundedIcon sx={{ fontSize: 18 }} />
            </span>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-100">Learn More About...</p>
              <p className="mt-1 text-sm text-indigo-100/85">Open any section to explore company context, locations, culture, and growth insights.</p>
            </div>
          </div>

          {onBackToDashboard && (
            <button
              type="button"
              onClick={onBackToDashboard}
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-white/20"
            >
              <HomeRoundedIcon sx={{ fontSize: 15 }} />
              Back To Dashboard
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-5 p-5 md:grid-cols-2">
        {cards.map((card) => {
          const isActive = card.key === activeCardKey;

          return (
            <button
              key={card.key}
              type="button"
              onClick={() => onOpenCard(card)}
              className={`group overflow-hidden rounded-3xl border text-left transition-all duration-300 ${
                isActive
                  ? "border-indigo-300 shadow-[0_18px_50px_rgba(79,70,229,0.14)]"
                  : "border-slate-200 bg-white hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_18px_50px_rgba(15,23,42,0.10)]"
              }`}
            >
              <div className={`relative min-h-64 overflow-hidden bg-linear-to-br ${card.accentClassName}`}>
                {card.imageUrl && (
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-65"
                    style={{ backgroundImage: `url(${card.imageUrl})` }}
                  />
                )}
                <div className={`absolute -left-10 -top-10 h-40 w-40 rounded-full blur-2xl ${card.glowClassName}`} />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_35%),linear-gradient(180deg,rgba(15,23,42,0.04),rgba(15,23,42,0.35))]" />
                <div className="absolute right-5 top-5 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-sm font-semibold text-indigo-700 shadow-sm">
                  {card.badge}
                </div>
                <div className="absolute inset-x-6 bottom-6">
                  <span className="inline-flex h-16 w-16 items-center justify-center rounded-[22px] border border-white/20 bg-white/10 text-white backdrop-blur-sm">
                    <CardHeroIcon iconName={card.iconName} />
                  </span>
                </div>
              </div>

              <div className="space-y-4 px-5 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold tracking-tight text-slate-950">{card.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{card.summary}</p>
                  </div>
                  <span
                    className="shrink-0 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-600"
                  >
                    {card.statusLabel}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm font-semibold text-indigo-700">
                  <span>{card.sectionHint || "Explore section"}</span>
                  <span className="inline-flex items-center gap-1">
                    Open
                    <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
