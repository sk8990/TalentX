import { NavLink, Outlet } from "react-router-dom";
import EventNoteIcon from "@mui/icons-material/EventNote";
import LogoutIcon from "@mui/icons-material/Logout";
import TalentXBrand from "../../components/TalentXBrand";
import { logout } from "../../utils/logout";

export default function InterviewerLayout() {
  const navItemClass = ({ isActive }) =>
    `group flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition ${
      isActive
        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto flex w-full max-w-[1440px]">
        <aside className="sticky top-0 hidden h-screen w-72 flex-col border-r border-slate-200 bg-white px-6 py-7 lg:flex">
          <div className="mb-10">
            <TalentXBrand theme="light" size="sm" className="max-w-[220px]" />
          </div>

          <nav className="flex flex-1 flex-col gap-2">
            <NavLink to="/interviewer" end className={navItemClass}>
              <EventNoteIcon sx={{ fontSize: 18 }} />
              Interviews
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
          <div className="border-b border-slate-200 bg-white px-5 py-4 sm:px-8 lg:hidden">
            <div className="flex items-center justify-between">
              <TalentXBrand theme="light" size="sm" className="max-w-[220px]" />
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

          <div className="px-4 py-6 sm:px-8 sm:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
