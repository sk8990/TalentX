import { useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { logout } from "../utils/logout";
import NotificationBell from "../components/NotificationBell";
import DarkModeToggle from "../components/DarkModeToggle";
import DashboardIcon from "@mui/icons-material/Dashboard";
import WorkIcon from "@mui/icons-material/Work";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import PersonIcon from "@mui/icons-material/Person";
import SettingsIcon from "@mui/icons-material/Settings";
import VideocamIcon from "@mui/icons-material/Videocam";
import QuizIcon from "@mui/icons-material/Quiz";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import LogoutIcon from "@mui/icons-material/Logout";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import TalentXBrand from "../components/TalentXBrand";
import { clearStoredOnboardingInstanceId } from "../onboarding/session";

export default function StudentLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const links = [
    { to: "/student/dashboard", label: "Dashboard", icon: DashboardIcon },
    { to: "/student/jobs", label: "Job Profiles", icon: WorkIcon },
    { to: "/student/applications", label: "Applications", icon: AssignmentTurnedInIcon },
    { to: "/student/profile", label: "My Profile", icon: PersonIcon },
    { to: "/student/interviews", label: "Interviews", icon: VideocamIcon },
    { to: "/student/assessments", label: "Assessments", icon: QuizIcon },
    { to: "/onboarding", label: "Onboarding", icon: BadgeOutlinedIcon },
    { to: "/student/support", label: "Support", icon: SupportAgentIcon },
    { to: "/student/faq", label: "FAQ", icon: HelpOutlineIcon },
    { to: "/student/settings", label: "Settings", icon: SettingsIcon },
  ];

  const navItemClass = ({ isActive }) =>
    `group flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
      isActive
        ? "bg-[#243b95] text-white shadow-lg shadow-[#243b95]/20"
        : "text-slate-600 hover:bg-[#eef3ff] hover:text-[#243b95] dark:text-slate-300 dark:hover:bg-slate-800"
    }`;

  const drawerNavClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
      isActive
        ? "bg-[#243b95] text-white shadow-lg shadow-[#243b95]/20"
        : "text-slate-700 hover:bg-[#eef3ff] hover:text-[#243b95] dark:text-slate-300 dark:hover:bg-slate-800"
    }`;

  const handleLinkClick = (linkTo) => {
    if (linkTo === "/onboarding") {
      clearStoredOnboardingInstanceId();
    }
  };

  return (
    <div className="tx-app-shell">
      <div className="mx-auto flex w-full max-w-[1440px]">
        {/* ── Desktop Sidebar ── */}
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white px-6 py-7 dark:border-slate-700 dark:bg-slate-900 lg:flex">
          <div className="mb-8 flex items-start justify-between gap-3">
            <TalentXBrand
              theme="light"
              size="sm"
              className="max-w-[210px]"
            />
            <NotificationBell />
          </div>

          <nav className="flex flex-1 flex-col gap-2">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} className={navItemClass} onClick={() => handleLinkClick(link.to)}>
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-600 transition dark:bg-slate-800 dark:text-slate-400">
                  <link.icon sx={{ fontSize: 16 }} />
                </span>
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto space-y-3 pt-5">
            <div className="flex items-center gap-2">
              <DarkModeToggle />
            </div>

            <button
              onClick={logout}
              className="w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-400 dark:hover:bg-rose-900"
            >
              <span className="inline-flex items-center gap-2">
                <LogoutIcon sx={{ fontSize: 16 }} />
                Logout
              </span>
            </button>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className="min-h-screen flex-1 min-w-0">
          {/* ── Mobile Header ── */}
          <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95 sm:px-6 lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setDrawerOpen(true)}
                  className="rounded-lg p-1.5 text-slate-600 transition hover:bg-slate-100"
                  aria-label="Open navigation"
                >
                  <MenuRoundedIcon sx={{ fontSize: 22 }} />
                </button>
                <TalentXBrand
                  theme="light"
                  size="sm"
                  className="max-w-[180px]"
                  textClassName="text-slate-500"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <NotificationBell />
                <DarkModeToggle />
              </div>
            </div>
          </div>

          {/* ── Page Content ── */}
          <div className="px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* ── Mobile Drawer Overlay ── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── Mobile Drawer ── */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-white shadow-2xl transition-transform duration-300 ease-in-out dark:bg-slate-900 lg:hidden ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col overflow-y-auto px-5 py-5">
          {/* Drawer Header */}
          <div className="mb-5 flex items-center justify-between">
            <TalentXBrand
              theme="light"
              size="sm"
              className="max-w-[180px]"
            />
            <button
              onClick={() => setDrawerOpen(false)}
              className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-100"
              aria-label="Close navigation"
            >
              <CloseRoundedIcon sx={{ fontSize: 20 }} />
            </button>
          </div>

          {/* Drawer Nav Links */}
          <nav className="flex flex-1 flex-col gap-1.5">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={drawerNavClass}
                onClick={() => {
                  handleLinkClick(link.to);
                  setDrawerOpen(false);
                }}
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition dark:bg-slate-800 dark:text-slate-400">
                  <link.icon sx={{ fontSize: 16 }} />
                </span>
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Drawer Footer */}
          <div className="mt-auto space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700">
            <DarkModeToggle />
            <button
              onClick={logout}
              className="w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-400 dark:hover:bg-rose-900"
            >
              <span className="inline-flex items-center gap-2">
                <LogoutIcon sx={{ fontSize: 16 }} />
                Logout
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
