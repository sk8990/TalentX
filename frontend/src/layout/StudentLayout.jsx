import { useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { logout } from "../utils/logout";
import NotificationBell from "../components/NotificationBell";
import DarkModeToggle from "../components/DarkModeToggle";
import DashboardIcon from "@mui/icons-material/Dashboard";
import WorkIcon from "@mui/icons-material/Work";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import PersonIcon from "@mui/icons-material/Person";
import VideocamIcon from "@mui/icons-material/Videocam";
import QuizIcon from "@mui/icons-material/Quiz";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import LogoutIcon from "@mui/icons-material/Logout";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import TalentXBrand from "../components/TalentXBrand";

export default function StudentLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const links = [
    { to: "/student/dashboard", label: "Dashboard", icon: DashboardIcon },
    { to: "/student/jobs", label: "Job Profiles", icon: WorkIcon },
    { to: "/student/applications", label: "Applications", icon: AssignmentTurnedInIcon },
    { to: "/student/profile", label: "My Profile", icon: PersonIcon },
    { to: "/student/interviews", label: "Interviews", icon: VideocamIcon },
    { to: "/student/assessments", label: "Assessments", icon: QuizIcon },
    { to: "/student/support", label: "Support", icon: SupportAgentIcon },
    { to: "/student/faq", label: "FAQ", icon: HelpOutlineIcon },
  ];

  const navItemClass = ({ isActive }) =>
    `group flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
      isActive
        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700"
    }`;

  const drawerNavClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
      isActive
        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
        : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
    }`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="mx-auto flex w-full max-w-[1440px]">
        {/* ── Desktop Sidebar ── */}
        <aside className="sticky top-0 hidden h-screen w-72 flex-col overflow-y-auto border-r border-slate-200 bg-white px-6 py-7 dark:border-slate-700 dark:bg-slate-800 lg:flex">
          <div className="mb-8 flex items-start justify-between gap-3">
            <TalentXBrand
              theme="light"
              size="sm"
              className="max-w-[210px]"
              textClassName="dark:text-slate-300"
              emphasisClassName="dark:text-white"
            />
            <NotificationBell />
          </div>

          <nav className="flex flex-1 flex-col gap-2">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} className={navItemClass}>
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-200 text-slate-700 transition group-[.bg-indigo-600]:bg-white/20 group-[.bg-indigo-600]:text-white dark:bg-slate-600 dark:text-slate-200">
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
              className="w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-400"
            >
              <span className="inline-flex items-center gap-2">
                <LogoutIcon sx={{ fontSize: 16 }} />
                Logout
              </span>
            </button>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className="min-h-screen flex-1">
          {/* ── Mobile Header ── */}
          <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur-md dark:border-slate-700 dark:bg-slate-800/90 sm:px-6 lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setDrawerOpen(true)}
                  className="rounded-lg p-1.5 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300"
                  aria-label="Open navigation"
                >
                  <MenuRoundedIcon sx={{ fontSize: 22 }} />
                </button>
                <TalentXBrand
                  theme="light"
                  size="sm"
                  className="max-w-[180px]"
                  textClassName="text-slate-500 dark:text-slate-300"
                  emphasisClassName="dark:text-white"
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
        className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-white shadow-2xl transition-transform duration-300 ease-in-out dark:bg-slate-800 lg:hidden ${
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
              textClassName="dark:text-slate-300"
              emphasisClassName="dark:text-white"
            />
            <button
              onClick={() => setDrawerOpen(false)}
              className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400"
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
                onClick={() => setDrawerOpen(false)}
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition group-[.bg-indigo-600]:bg-white/20 group-[.bg-indigo-600]:text-white dark:bg-slate-700 dark:text-slate-300">
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
              className="w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-400"
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
