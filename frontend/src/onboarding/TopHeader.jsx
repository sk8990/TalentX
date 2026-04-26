import { useEffect, useRef, useState } from "react";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import HourglassTopRoundedIcon from "@mui/icons-material/HourglassTopRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import { TalentXMark } from "../components/TalentXBrand";
import { logout } from "../utils/logout";
import { buildOverallStatusLabel, getInitials } from "./constants";
import { clearOnboardingSession } from "./session";

export default function TopHeader({ companies, selectedInstance, user, onSelectCompany, onBackToDashboard }) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    function handleDocumentMouseDown(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    }

    function handleEscapeKey(event) {
      if (event.key === "Escape") {
        setIsProfileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleDocumentMouseDown);
    document.addEventListener("keydown", handleEscapeKey);

    return () => {
      document.removeEventListener("mousedown", handleDocumentMouseDown);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, []);

  const handleLogout = () => {
    clearOnboardingSession();
    logout();
  };

  return (
    <header className="border-b border-slate-800 bg-[linear-gradient(90deg,#243b95_0%,#22389c_40%,#1d2f80_100%)] text-white shadow-sm">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-3 py-3 sm:gap-4 sm:px-5 sm:py-4 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-center gap-4">
          <TalentXMark theme="dark" size="md" />
          <div className="min-w-0">
            <p className="text-lg font-semibold tracking-tight text-white sm:text-2xl">TalentX</p>
            <p className="text-xs text-indigo-100/80 sm:text-sm">Campus Onboarding Dashboard</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 sm:justify-end">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white">
            <HourglassTopRoundedIcon sx={{ fontSize: 16 }} />
            {buildOverallStatusLabel(selectedInstance?.status)}
          </span>

          {onBackToDashboard && (
            <button
              type="button"
              onClick={onBackToDashboard}
              className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              <HomeRoundedIcon sx={{ fontSize: 16 }} />
              Back To Dashboard
            </button>
          )}

          <div className="relative">
            <select
              value={selectedInstance?.id || ""}
              onChange={(event) => onSelectCompany(event.target.value)}
              className="min-w-0 max-w-[200px] appearance-none truncate rounded-[18px] border border-white/15 bg-white/10 px-3 py-2.5 pr-10 text-sm font-semibold text-white outline-none transition focus:border-white/35 sm:max-w-none sm:px-4 sm:py-3 sm:pr-11"
            >
              {companies.map((company) => (
                <option key={company.id} value={company.id} className="text-slate-900">
                  {company.companyName} - {company.jobRole}
                </option>
              ))}
            </select>
            <KeyboardArrowDownRoundedIcon className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/70" />
          </div>

          <div className="hidden items-center gap-3 rounded-[18px] border border-white/15 bg-white/10 px-4 py-3 sm:flex">
            <div className="text-right">
              <p className="text-sm font-semibold text-white">{user?.name}</p>
            </div>
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen((current) => !current)}
                aria-haspopup="menu"
                aria-expanded={isProfileMenuOpen}
                aria-label="Open profile menu"
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
              >
                {getInitials(user?.name)}
              </button>

              {isProfileMenuOpen && (
                <div className="absolute right-0 top-[calc(100%+0.5rem)] z-30 min-w-[150px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.18)]">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <LogoutRoundedIcon sx={{ fontSize: 18 }} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
