import BusinessCenterRoundedIcon from "@mui/icons-material/BusinessCenterRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TalentXMark } from "../components/TalentXBrand";
import { getInitials } from "./constants";
import { buildServerAssetUrl } from "./api";

export default function SelectorScreen({ data, onSelectCompany }) {
  const companies = data?.companies || [];
  const navigate = useNavigate();
  const [logoFailedByCompany, setLogoFailedByCompany] = useState({});

  const cardThemes = [
    {
      iconWrap: "bg-[#5f63e9]",
      iconText: "text-white",
      bar: "bg-[#5f63e9]",
      button: "bg-[#5f63e9] hover:bg-[#5055db]",
    },
    {
      iconWrap: "bg-[#1742b0]",
      iconText: "text-white",
      bar: "bg-[#1742b0]",
      button: "bg-[#1742b0] hover:bg-[#123893]",
    },
    {
      iconWrap: "bg-[#0ea5e9]",
      iconText: "text-white",
      bar: "bg-[#0ea5e9]",
      button: "bg-[#0ea5e9] hover:bg-[#0284c7]",
    },
  ];

  const getProgressFromCompany = (company) => {
    const completed = Number(company?.progress?.completed);
    const total = Number(company?.progress?.total);

    if (Number.isFinite(completed) && Number.isFinite(total) && total > 0) {
      return {
        completed,
        total,
        percentage: Math.min(100, Math.max(0, Math.round((completed / total) * 100))),
      };
    }

    const label = String(company?.progress?.label || "");
    const matched = label.match(/(\d+)\s*\/\s*(\d+)/);
    const parsedCompleted = Number(matched?.[1] || 0);
    const parsedTotal = Number(matched?.[2] || 0);

    return {
      completed: parsedCompleted,
      total: parsedTotal,
      percentage: parsedTotal > 0 ? Math.min(100, Math.max(0, Math.round((parsedCompleted / parsedTotal) * 100))) : 0,
    };
  };

  const buildCompanyLogoUrl = (company) => {
    const rawLogo = String(company?.companyLogo || "").trim();
    if (rawLogo) {
      return buildServerAssetUrl(rawLogo);
    }

    const rawDomain = String(company?.companyDomain || "").trim().toLowerCase();
    if (!rawDomain) {
      return "";
    }

    const normalizedDomain = rawDomain
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
      .split("?")[0];

    return normalizedDomain ? `https://img.logo.dev/${normalizedDomain}` : "";
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(160deg,#eef2ff_0%,#f4f5f8_38%,#eef3ff_100%)] px-4 py-10">
      <div className="w-full max-w-6xl">
        <div className="mb-6 flex justify-start">
          <button
            type="button"
            onClick={() => navigate("/student/dashboard")}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            <ArrowBackRoundedIcon sx={{ fontSize: 18 }} />
            Back To Dashboard
          </button>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-3">
            <TalentXMark theme="light" size="lg" className="shadow-sm" />
            <p className="text-[24px] font-semibold tracking-tight text-slate-950">TalentX Onboarding Portal</p>
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-950">Select Company to Continue</h1>
          <p className="mt-3 text-[18px] text-slate-600">
            You have multiple offers. Choose a company to continue onboarding.
          </p>
        </div>

        {companies.length === 0 ? (
          <div className="mx-auto mt-12 max-w-xl rounded-[18px] border border-slate-200 bg-white px-8 py-10 text-center shadow-sm">
            <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <BusinessCenterRoundedIcon sx={{ fontSize: 28 }} />
            </span>
            <h2 className="mt-5 text-2xl font-semibold text-slate-950">No companies available yet</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Your onboarding companies will appear here after a recruiter selects you and generates an offer letter.
            </p>
            <button
              type="button"
              onClick={() => navigate("/student/dashboard")}
              className="mt-6 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Back To Dashboard
            </button>
          </div>
        ) : (
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {companies.map((company, index) => {
            const theme = cardThemes[index % cardThemes.length];
            const progress = getProgressFromCompany(company);
            const logoUrl = buildCompanyLogoUrl(company);
            const hasLogo = Boolean(logoUrl) && !logoFailedByCompany[company.id];

            return (
              <article
                key={company.id}
                className="flex h-full flex-col rounded-[14px] border border-slate-300 bg-white p-6 shadow-[0_1px_1px_rgba(15,23,42,0.04)] transition-transform duration-200 hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-center">
                  <span className="inline-flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    {hasLogo ? (
                      <img
                        src={logoUrl}
                        alt={`${company.companyName} logo`}
                        className="h-10 w-10 object-contain"
                        referrerPolicy="origin"
                        onError={() => setLogoFailedByCompany((current) => ({ ...current, [company.id]: true }))}
                      />
                    ) : (
                      <span className={`text-base font-semibold ${theme.iconWrap} ${theme.iconText} rounded-lg px-2 py-1`}>
                        {getInitials(company.companyName)}
                      </span>
                    )}
                  </span>
                </div>

                <div className="mt-5 text-center">
                  <h2 className="text-3xl font-semibold tracking-tight text-slate-900">{company.companyName}</h2>
                  <p className="mt-2 inline-flex items-center gap-1.5 text-base text-slate-700">
                    <BusinessCenterRoundedIcon sx={{ fontSize: 18 }} />
                    {company.jobRole}
                  </p>
                </div>

                <div className="mt-auto pt-5">
                  <div>
                    <div className="flex items-center justify-between text-sm text-slate-700">
                      <span>Onboarding Progress</span>
                      <span>{`${progress.completed}/${progress.total}`}</span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                      <div className={`h-full rounded-full ${theme.bar}`} style={{ width: `${progress.percentage}%` }} />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectCompany(company.id)}
                    className={`mt-6 w-full rounded-[10px] px-4 py-3 text-lg font-semibold text-white transition ${theme.button}`}
                  >
                    Continue Onboarding
                  </button>
                </div>
              </article>
            );
            })}
          </div>
        )}

        {companies.length > 0 && (
          <p className="mt-8 text-center text-base text-slate-600">
            You can switch between companies anytime from the dashboard
          </p>
        )}
      </div>
    </div>
  );
}
