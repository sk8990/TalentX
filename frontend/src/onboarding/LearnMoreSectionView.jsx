import { useEffect, useMemo, useState } from "react";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import TravelExploreRoundedIcon from "@mui/icons-material/TravelExploreRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import TimelineRoundedIcon from "@mui/icons-material/TimelineRounded";

function formatGeneratedAt(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function timelineBadgeClass(statusLabel) {
  if (statusLabel === "Completed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (statusLabel === "In Progress") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}


export default function LearnMoreSectionView({ sectionKey, payload, loading, onBack }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");


  const content = payload?.content || {};
  const locations = Array.isArray(content.locations) ? content.locations : [];
  const timeline = Array.isArray(content.timeline) ? content.timeline : [];
  const sections = Array.isArray(content.sections) ? content.sections : [];
  const keyTakeaways = Array.isArray(content.keyTakeaways) ? content.keyTakeaways : [];

  useEffect(() => {
    setSearchTerm("");
    setCountryFilter("all");
  }, [sectionKey, payload?.generatedAt]);

  const countries = useMemo(() => {
    const list = locations
      .map((item) => String(item?.country || "").trim())
      .filter(Boolean);
    return [...new Set(list)].sort((a, b) => a.localeCompare(b));
  }, [locations]);

  const filteredLocations = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return locations.filter((item) => {
      const country = String(item?.country || "").trim();
      if (countryFilter !== "all" && country !== countryFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = `${item?.officeName || ""} ${item?.city || ""} ${item?.country || ""} ${item?.address || ""}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [locations, countryFilter, searchTerm]);



  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Learn More Section</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{payload?.title || "Learn More"}</h2>
            <p className="mt-1 text-sm text-slate-600">{payload?.subtitle || ""}</p>
            {payload?.generatedAt && (
              <p className="mt-2 text-xs text-slate-500">Updated {formatGeneratedAt(payload.generatedAt)}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <ArrowBackRoundedIcon sx={{ fontSize: 18 }} />
            Back To Cards
          </button>
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-6 lg:p-7">
        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
            Loading section content...
          </div>
        )}

        {!loading && !payload && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            Could not load this section right now. Please try again.
          </div>
        )}

        {!loading && payload && (
          <>
            {content.intro && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-7 text-slate-700">
                {content.intro}
              </div>
            )}

            {sectionKey === "onboarding-journey" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 px-5 py-4 text-sm text-indigo-700">
                  <p className="inline-flex items-center gap-2 font-semibold">
                    <TimelineRoundedIcon sx={{ fontSize: 18 }} />
                    Journey Timeline
                  </p>
                  <p className="mt-1">This timeline reflects your current onboarding workflow status.</p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {timeline.map((item) => (
                    <article key={item.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Step {item.order}</p>
                          <h3 className="mt-1 text-lg font-semibold text-slate-900">{item.title}</h3>
                          {item.description && <p className="mt-2 text-sm text-slate-600">{item.description}</p>}
                        </div>
                        <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${timelineBadgeClass(item.statusLabel)}`}>
                          {item.statusLabel}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {sectionKey === "locations" && (
              <div className="space-y-4">
                <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
                  <label className="block">
                    <span className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <TravelExploreRoundedIcon sx={{ fontSize: 18 }} />
                      Global Search
                    </span>
                    <input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Search office, city, country, or address"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <PublicRoundedIcon sx={{ fontSize: 18 }} />
                      Country Filter
                    </span>
                    <select
                      value={countryFilter}
                      onChange={(event) => setCountryFilter(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400"
                    >
                      <option value="all">All Countries</option>
                      {countries.map((country) => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <p className="text-sm text-slate-600">
                  Showing {filteredLocations.length} of {locations.length} discovered locations.
                </p>


                {filteredLocations.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
                    No locations match your current search and country filter.
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {filteredLocations.map((item, index) => (
                      <article key={`${item.officeName}-${item.city}-${item.country}-${index}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                        <p className="text-base font-semibold text-slate-900">{item.officeName}</p>
                        <p className="mt-1 text-sm text-slate-700">{[item.city, item.country].filter(Boolean).join(", ")}</p>
                        {item.address && <p className="mt-2 text-xs leading-6 text-slate-500">{item.address}</p>}


                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            {sections.length > 0 && (
              <div className="space-y-4">
                {sections.map((item, index) => (
                  <article key={`${item.heading}-${index}`} className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                    <p className="inline-flex items-center gap-2 text-base font-semibold text-slate-900">
                      <AutoAwesomeRoundedIcon sx={{ fontSize: 18 }} />
                      {item.heading}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{item.body}</p>
                  </article>
                ))}
              </div>
            )}

            {keyTakeaways.length > 0 && (
              <article className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">Key Takeaways</p>
                <ul className="mt-3 space-y-2 text-sm text-emerald-800">
                  {keyTakeaways.map((point, index) => (
                    <li key={`${index}-${point.slice(0, 14)}`} className="flex items-start gap-2">
                      <span className="mt-1 h-2 w-2 rounded-full bg-emerald-600" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </article>
            )}
          </>
        )}
      </div>
    </section>
  );
}
