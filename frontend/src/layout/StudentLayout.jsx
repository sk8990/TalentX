import { Outlet, NavLink } from "react-router-dom";
import { logout } from "../utils/logout";
import WorkIcon from "@mui/icons-material/Work";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import PersonIcon from "@mui/icons-material/Person";
import VideocamIcon from "@mui/icons-material/Videocam";
import QuizIcon from "@mui/icons-material/Quiz";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import LogoutIcon from "@mui/icons-material/Logout";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

export default function StudentLayout() {
  const links = [
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
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-cyan-50">
      <div className="mx-auto flex w-full max-w-[1440px]">
        <aside className="sticky top-0 hidden h-screen w-72 flex-col border-r border-slate-200 bg-white px-6 py-7 lg:flex">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-base font-bold text-white">TX</div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">TalentX</h1>
              <p className="text-xs text-slate-500">Student Workspace</p>
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-2">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} className={navItemClass}>
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-200 text-slate-700">
                  <link.icon sx={{ fontSize: 16 }} />
                </span>
                {link.label}
              </NavLink>
            ))}
          </nav>

          <button
            onClick={logout}
            className="mt-8 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
          >
            <span className="inline-flex items-center gap-2">
              <LogoutIcon sx={{ fontSize: 16 }} />
              Logout
            </span>
          </button>
        </aside>

        <main className="min-h-screen flex-1">
          <div className="border-b border-slate-200 bg-white/80 px-5 py-4 backdrop-blur-sm sm:px-8 lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white">TX</div>
                <div>
                  <h1 className="text-base font-bold text-slate-900">TalentX Student</h1>
                  <p className="text-xs text-slate-500">Track your journey</p>
                </div>
              </div>
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

            <nav className="mt-4 grid grid-cols-3 gap-2">
              {links.map((link) => (
                <NavLink key={link.to} to={link.to} className={navItemClass}>
                  {link.label}
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
