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
import TalentXBrand from "../components/TalentXBrand";

export default function StudentLayout() {
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

  const mobileNavItemClass = ({ isActive }) =>
    `group flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
      isActive
        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
        : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200"
    }`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="mx-auto flex w-full max-w-[1440px]">
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
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-200">
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

        <main className="min-h-screen flex-1">
          <div className="border-b border-slate-200 bg-white/80 px-5 py-4 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/80 sm:px-8 lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <TalentXBrand
                theme="light"
                size="sm"
                className="max-w-[220px]"
                textClassName="text-slate-500 dark:text-slate-300"
                emphasisClassName="dark:text-white"
              />
              <div className="flex items-center gap-2">
                <NotificationBell />
                <DarkModeToggle />
                <button
                  onClick={logout}
                  className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600"
                >
                  <span className="inline-flex items-center gap-1">
                    <LogoutIcon sx={{ fontSize: 14 }} />
                    Logout
                  </span>
                </button>
              </div>
            </div>

            <nav className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {links.map((link) => (
                <NavLink key={link.to} to={link.to} className={mobileNavItemClass}>
                  <link.icon sx={{ fontSize: 14 }} />
                  <span className="truncate">{link.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="px-4 py-6 sm:px-8 sm:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
