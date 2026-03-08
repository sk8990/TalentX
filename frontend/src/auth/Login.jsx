import { useState } from "react";
import API from "../api/axios";
import { Link, useNavigate } from "react-router-dom";
import WorkOutlineRoundedIcon from "@mui/icons-material/WorkOutlineRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import BusinessCenterRoundedIcon from "@mui/icons-material/BusinessCenterRounded";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const highlights = [
    "Hire Smarter",
    "Learn Faster",
    "Grow Careers",
    "Build Teams",
  ];

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await API.post("/auth/login", {
        email,
        password,
      });

      const token = res.data.token;
      const user = res.data.user;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      if (user.role === "student") {
        navigate("/student/jobs");
      } else if (user.role === "recruiter") {
        navigate("/recruiter");
      } else if (user.role === "admin") {
        navigate("/admin");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-100 px-6 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(79,70,229,0.22),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(59,130,246,0.2),transparent_32%),radial-gradient(circle_at_60%_80%,rgba(14,165,233,0.18),transparent_36%)]" />

      <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl lg:grid-cols-2">
        <section className="hidden bg-gradient-to-r from-[#4f2df4] via-[#3f63df] to-[#1588db] p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-3 rounded-xl bg-white/15 px-4 py-2 backdrop-blur">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-white text-indigo-700">
                <WorkOutlineRoundedIcon />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-cyan-100">Talent Platform</p>
                <h1 className="text-2xl font-black tracking-wide">TalentX</h1>
              </div>
            </div>

            <h2 className="mt-9 text-4xl font-black leading-tight">
              One Platform for Students, Recruiters, and Placement Teams.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-cyan-100">
              Track opportunities, apply to top companies, and manage hiring pipelines with speed and confidence.
            </p>
          </div>

          <div className="space-y-5">
            <div className="relative h-14 overflow-hidden rounded-xl border border-white/20 bg-white/10 px-5">
              <div className="ticker-track">
                {[...highlights, ...highlights].map((item, idx) => (
                  <span key={`${item}-${idx}`} className="ticker-item">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <StatCard icon={<SchoolRoundedIcon sx={{ fontSize: 18 }} />} label="Students" value="10k+" />
              <StatCard icon={<BusinessCenterRoundedIcon sx={{ fontSize: 18 }} />} label="Recruiters" value="500+" />
              <StatCard icon={<TrendingUpRoundedIcon sx={{ fontSize: 18 }} />} label="Placements" value="95%" />
            </div>
          </div>
        </section>

        <section className="p-8 md:p-12">
          <div className="mb-8 lg:hidden">
            <div className="inline-flex items-center gap-2 rounded-xl bg-indigo-100 px-3 py-2 text-indigo-900">
              <WorkOutlineRoundedIcon sx={{ fontSize: 18 }} />
              <span className="text-sm font-black tracking-wide">TalentX</span>
            </div>
          </div>

          <h2 className="text-3xl font-black text-slate-900">Sign in</h2>
          <p className="mt-2 text-sm text-slate-500">Access your dashboard and continue your journey.</p>

          {error && (
            <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-6 space-y-5">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-800 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="At least 8 characters"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-14 text-slate-800 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 text-sm font-semibold text-indigo-700 hover:text-indigo-900"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-slate-600">
                <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                Remember me
              </label>
              <Link to="/forgot-password" className="font-semibold text-indigo-700 hover:text-indigo-900">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Signing in..." : "Sign in to TalentX"}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-600">
            Don't have an account?{" "}
            <Link to="/register" className="font-semibold text-indigo-700 hover:text-indigo-900">
              Create one
            </Link>
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Learn more{" "}
            <Link to="/about" className="font-semibold text-indigo-700 hover:text-indigo-900">
              About TalentX
            </Link>
          </p>
        </section>
      </div>

      <style>{`
        .ticker-track {
          display: flex;
          align-items: center;
          gap: 2.2rem;
          width: max-content;
          white-space: nowrap;
          height: 100%;
          animation: ticker-slide 14s linear infinite;
        }

        .ticker-item {
          font-size: 1.15rem;
          font-weight: 800;
          letter-spacing: 0.02em;
          color: rgba(237, 242, 255, 0.98);
        }

        @keyframes ticker-slide {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-3 backdrop-blur">
      <p className="mb-1 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-indigo-100">
        {icon}
        {label}
      </p>
      <p className="text-lg font-black text-white">{value}</p>
    </div>
  );
}
