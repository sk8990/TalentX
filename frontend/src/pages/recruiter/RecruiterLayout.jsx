import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import DashboardIcon from "@mui/icons-material/Dashboard";
import WorkIcon from "@mui/icons-material/Work";
import GroupsIcon from "@mui/icons-material/Groups";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import PersonAddAltIcon from "@mui/icons-material/PersonAddAlt";
import LogoutIcon from "@mui/icons-material/Logout";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import NotificationBell from "../../components/NotificationBell";
import DarkModeToggle from "../../components/DarkModeToggle";
import TalentXBrand from "../../components/TalentXBrand";
import ScreenLoader from "../../components/ScreenLoader";
import API from "../../api/axios";
import { logout } from "../../utils/logout";

function readStoredRecruiterApproval() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const status = user?.recruiterApprovalStatus || (user?.isRecruiterApproved ? "approved" : "pending");
    return {
      recruiterApprovalStatus: status,
      isRecruiterApproved: status === "approved" && user?.isRecruiterApproved === true
    };
  } catch {
    return { recruiterApprovalStatus: "pending", isRecruiterApproved: false };
  }
}

function mergeStoredRecruiterApproval(nextStatus) {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!user) return;
    localStorage.setItem(
      "user",
      JSON.stringify({
        ...user,
        recruiterApprovalStatus: nextStatus.recruiterApprovalStatus,
        isRecruiterApproved: nextStatus.isRecruiterApproved,
        companyName: nextStatus.companyName ?? user.companyName,
        companyEmail: nextStatus.companyEmail ?? user.companyEmail,
        companyWebsite: nextStatus.companyWebsite ?? user.companyWebsite
      })
    );
  } catch {
    // Stored auth is repaired by the global auth flow on the next login.
  }
}

export default function RecruiterLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [approval, setApproval] = useState(readStoredRecruiterApproval);
  const [approvalLoading, setApprovalLoading] = useState(true);

  const links = [
    { to: "/recruiter/dashboard", label: "Dashboard", icon: DashboardIcon },
    { to: "/recruiter/jobs", label: "Jobs", icon: WorkIcon },
    { to: "/recruiter/applications", label: "Applications", icon: GroupsIcon },
    { to: "/recruiter/interviewers", label: "Interviewers", icon: PersonAddAltIcon },
    { to: "/recruiter/onboarding", label: "Onboarding", icon: BadgeOutlinedIcon },
    { to: "/recruiter/subscription", label: "Subscription", icon: CreditCardIcon },
    { to: "/recruiter/support", label: "Support", icon: SupportAgentIcon },
  ];
  const recruiterApproved =
    approval.recruiterApprovalStatus === "approved" &&
    approval.isRecruiterApproved === true;
  const visibleLinks = recruiterApproved ? links : [];

  useEffect(() => {
    let mounted = true;

    API.get("/recruiter/approval-status")
      .then((res) => {
        if (!mounted) return;
        const nextApproval = {
          ...res.data,
          recruiterApprovalStatus: res.data?.recruiterApprovalStatus || "pending",
          isRecruiterApproved: res.data?.isRecruiterApproved === true
        };
        setApproval(nextApproval);
        mergeStoredRecruiterApproval(nextApproval);
      })
      .catch(() => {
        if (mounted) {
          setApproval(readStoredRecruiterApproval());
        }
      })
      .finally(() => {
        if (mounted) {
          setApprovalLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

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

  return (
    <div className="tx-app-shell">
      <div className="mx-auto flex w-full max-w-[1440px]">
        {/* ── Desktop Sidebar ── */}
        <aside className="sticky top-0 hidden h-screen w-72 flex-col overflow-y-auto border-r border-slate-200 bg-white px-6 py-7 dark:border-slate-700 dark:bg-slate-900 lg:flex">
          <div className="mb-8 flex items-start justify-between gap-3">
            <TalentXBrand
              theme="light"
              size="sm"
              className="max-w-[210px]"
            />
            <NotificationBell />
          </div>

          <nav className="flex flex-1 flex-col gap-2">
            {visibleLinks.map((link) => (
              <NavLink key={link.to} to={link.to} className={navItemClass}>
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-600 transition dark:bg-slate-800 dark:text-slate-400">
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
        <main className="min-h-screen flex-1">
          {/* ── Mobile Header ── */}
          <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95 sm:px-6 lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setDrawerOpen(true)}
                  className="rounded-lg p-1.5 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
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
            {approvalLoading ? (
              <ScreenLoader
                message="Checking recruiter approval..."
                subtext="Confirming your TalentX recruiter access."
              />
            ) : recruiterApproved ? (
              <Outlet />
            ) : (
              <RecruiterApprovalNotice status={approval.recruiterApprovalStatus} />
            )}
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
          <div className="mb-5 flex items-center justify-between">
            <TalentXBrand
              theme="light"
              size="sm"
              className="max-w-[180px]"
            />
            <button
              onClick={() => setDrawerOpen(false)}
              className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Close navigation"
            >
              <CloseRoundedIcon sx={{ fontSize: 20 }} />
            </button>
          </div>

          <nav className="flex flex-1 flex-col gap-1.5">
            {visibleLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={drawerNavClass}
                onClick={() => setDrawerOpen(false)}
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition dark:bg-slate-800 dark:text-slate-400">
                  <link.icon sx={{ fontSize: 16 }} />
                </span>
                {link.label}
              </NavLink>
            ))}
          </nav>

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

function RecruiterApprovalNotice({ status }) {
  const normalizedStatus = status || "pending";
  const messageMap = {
    rejected: "Your recruiter account has been rejected. Please contact TalentX support.",
    suspended: "Your recruiter account has been suspended. Please contact TalentX support.",
    pending:
      "Your recruiter account is pending approval from TalentX Super Admin. You will be able to post jobs and manage interviews after approval."
  };
  const title =
    normalizedStatus === "rejected"
      ? "Recruiter Account Rejected"
      : normalizedStatus === "suspended"
        ? "Recruiter Account Suspended"
        : "Recruiter Approval Pending";

  return (
    <section className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center">
      <div className="w-full rounded-2xl border border-amber-200 bg-white p-6 text-center shadow-sm dark:border-amber-800 dark:bg-slate-900 sm:rounded-3xl sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          <BadgeOutlinedIcon sx={{ fontSize: 28 }} />
        </div>
        <h1 className="mt-5 text-2xl font-black text-slate-950 dark:text-slate-100 sm:text-3xl">{title}</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          {messageMap[normalizedStatus] || messageMap.pending}
        </p>
        <button
          type="button"
          onClick={logout}
          className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          Logout
        </button>
      </div>
    </section>
  );
}
