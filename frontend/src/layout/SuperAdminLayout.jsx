import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import AssignmentTurnedInRoundedIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import BusinessCenterRoundedIcon from "@mui/icons-material/BusinessCenterRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import PersonAddAltRoundedIcon from "@mui/icons-material/PersonAddAltRounded";
import HowToRegRoundedIcon from "@mui/icons-material/HowToRegRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import NotificationBell from "../components/NotificationBell";
import DarkModeToggle from "../components/DarkModeToggle";
import TalentXBrand from "../components/TalentXBrand";
import { logout } from "../utils/logout";

export default function SuperAdminLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const links = [
    { to: "/super-admin/dashboard", label: "Dashboard", icon: DashboardRoundedIcon },
    { to: "/super-admin/packages", label: "Packages", icon: Inventory2RoundedIcon },
    { to: "/super-admin/payments", label: "Payments", icon: PaymentsRoundedIcon },
    { to: "/super-admin/revenue", label: "Revenue", icon: InsightsRoundedIcon },
    { to: "/super-admin/subscriptions", label: "Subscriptions", icon: AssignmentTurnedInRoundedIcon },
    { to: "/super-admin/universities", label: "Universities", icon: ApartmentRoundedIcon },
    { to: "/super-admin/recruiters", label: "Recruiters", icon: BusinessCenterRoundedIcon },
    { to: "/super-admin/colleges", label: "Colleges", icon: SchoolRoundedIcon },
    { to: "/super-admin/college-admins", label: "College Admins", icon: PersonAddAltRoundedIcon },
    { to: "/super-admin/recruiter-approvals", label: "Recruiter Approvals", icon: HowToRegRoundedIcon },
    { to: "/super-admin/settings", label: "Settings", icon: SettingsRoundedIcon }
  ];

  const navItemClass = ({ isActive }) =>
    `group flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
      isActive
        ? "bg-[#243b95] text-white shadow-lg shadow-[#243b95]/20"
        : "text-slate-600 hover:bg-[#eef3ff] hover:text-[#243b95]"
    }`;

  const drawerNavClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
      isActive
        ? "bg-[#243b95] text-white shadow-lg shadow-[#243b95]/20"
        : "text-slate-700 hover:bg-[#eef3ff] hover:text-[#243b95]"
    }`;

  return (
    <div className="tx-app-shell">
      <div className="mx-auto flex w-full max-w-[1440px]">
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white px-6 py-7 lg:flex">
          <div className="mb-8 flex items-start justify-between gap-3">
            <TalentXBrand theme="light" size="sm" className="max-w-[210px]" />
            <NotificationBell />
          </div>

          <p className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Super Admin Console
          </p>

          <nav className="flex flex-1 flex-col gap-2">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} className={navItemClass}>
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-600 transition">
                  <link.icon sx={{ fontSize: 16 }} />
                </span>
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto space-y-3 pt-5">
            <DarkModeToggle />
            <button
              onClick={logout}
              className="w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
            >
              <span className="inline-flex items-center gap-2">
                <LogoutIcon sx={{ fontSize: 16 }} />
                Logout
              </span>
            </button>
          </div>
        </aside>

        <main className="min-h-screen flex-1 min-w-0 bg-[#f4f6fb]">
          <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-md sm:px-6 lg:hidden">
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

          <div className="px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>

      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-white shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col overflow-y-auto px-5 py-5">
          <div className="mb-5 flex items-center justify-between">
            <TalentXBrand theme="light" size="sm" className="max-w-[180px]" />
            <button
              onClick={() => setDrawerOpen(false)}
              className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-100"
              aria-label="Close navigation"
            >
              <CloseRoundedIcon sx={{ fontSize: 20 }} />
            </button>
          </div>

          <p className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Super Admin Console
          </p>

          <nav className="flex flex-1 flex-col gap-1.5">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={drawerNavClass}
                onClick={() => setDrawerOpen(false)}
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition">
                  <link.icon sx={{ fontSize: 16 }} />
                </span>
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto space-y-3 border-t border-slate-200 pt-4">
            <DarkModeToggle />
            <button
              onClick={logout}
              className="w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
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
