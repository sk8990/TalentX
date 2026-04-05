import { NavLink, Outlet } from "react-router-dom";
import DashboardIcon from "@mui/icons-material/Dashboard";
import WorkIcon from "@mui/icons-material/Work";
import GroupsIcon from "@mui/icons-material/Groups";
import LogoutIcon from "@mui/icons-material/Logout";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import NotificationBell from "../../components/NotificationBell";
import TalentXBrand from "../../components/TalentXBrand";
import { logout } from "../../utils/logout";

export default function RecruiterLayout() {
  const navItemClass = ({ isActive }) =>
    `group flex items-center rounded-xl px-4 py-3 text-sm font-medium transition ${
      isActive
        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto flex w-full max-w-[1440px]">
        <aside className="sticky top-0 hidden h-screen w-72 flex-col border-r border-slate-200 bg-white px-6 py-7 lg:flex">
          <div className="mb-10 flex items-start justify-between gap-3">
            <TalentXBrand theme="light" size="sm" className="max-w-[220px]" />
            <NotificationBell />
          </div>

          <nav className="flex flex-1 flex-col gap-2">
            <NavLink to="/recruiter/dashboard" className={navItemClass}>
              <DashboardIcon sx={{ fontSize: 18 }} />
              Dashboard
            </NavLink>
            <NavLink to="/recruiter/jobs" className={navItemClass}>
              <WorkIcon sx={{ fontSize: 18 }} />
              Jobs
            </NavLink>
            <NavLink to="/recruiter/applications" className={navItemClass}>
              <GroupsIcon sx={{ fontSize: 18 }} />
              Applications
            </NavLink>
            <NavLink to="/recruiter/support" className={navItemClass}>
              <SupportAgentIcon sx={{ fontSize: 18 }} />
              Support
            </NavLink>
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TalentXBrand theme="light" size="sm" className="max-w-[220px]" />
                <NotificationBell />
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
            <nav className="mt-4 grid grid-cols-4 gap-2">
              <NavLink to="/recruiter/dashboard" className={navItemClass}>
                Dashboard
              </NavLink>
              <NavLink to="/recruiter/jobs" className={navItemClass}>
                Jobs
              </NavLink>
              <NavLink to="/recruiter/applications" className={navItemClass}>
                Applications
              </NavLink>
              <NavLink to="/recruiter/support" className={navItemClass}>
                Support
              </NavLink>
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
