import { createElement } from "react";
import { Link } from "react-router-dom";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import SchoolIcon from "@mui/icons-material/School";
import BusinessCenterIcon from "@mui/icons-material/BusinessCenter";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import VerifiedIcon from "@mui/icons-material/Verified";
import GroupsIcon from "@mui/icons-material/Groups";

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-cyan-100 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-800 to-cyan-700 px-6 py-10 text-white shadow-xl sm:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">About TalentX</p>
          <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl">A Smarter Campus Hiring Platform</h1>
          <p className="mt-4 max-w-3xl text-sm text-slate-200 sm:text-base">
            TalentX connects students, recruiters, and institutions in one workflow. Students discover relevant jobs, recruiters manage pipelines faster, and admins keep the platform healthy.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/" className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100">
              Login
            </Link>
            <Link to="/register" className="rounded-xl border border-white/40 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20">
              Create Account
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <FeatureCard icon={SchoolIcon} title="For Students" text="Build profiles, apply to matching roles, and track assessments and interviews in one dashboard." />
          <FeatureCard icon={BusinessCenterIcon} title="For Recruiters" text="Post jobs, review applications, and move candidates across shortlist, assessment, interview, and offer stages." />
          <FeatureCard icon={AnalyticsIcon} title="For Admins" text="Monitor activity, manage users, approve recruiters, and handle support tickets with clear visibility." />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-bold text-slate-900">Why TalentX</h2>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InfoItem icon={VerifiedIcon} text="Role-based secure access for student, recruiter, and admin flows." />
            <InfoItem icon={RocketLaunchIcon} text="Fast, modern workflows designed for campus placements." />
            <InfoItem icon={GroupsIcon} text="Centralized communication and support ticketing for issue resolution." />
            <InfoItem icon={AnalyticsIcon} text="Data-backed insights and status tracking across the hiring pipeline." />
          </div>
        </section>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, text }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
        {icon ? createElement(icon, { sx: { fontSize: 22 } }) : null}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{text}</p>
    </article>
  );
}

function InfoItem({ icon, text }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-indigo-700">
        {icon ? createElement(icon, { sx: { fontSize: 18 } }) : null}
      </span>
      <p className="text-sm text-slate-700">{text}</p>
    </div>
  );
}
