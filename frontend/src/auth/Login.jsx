import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import BusinessCenterRoundedIcon from "@mui/icons-material/BusinessCenterRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import API from "../api/axios";
import "./Login.css";
import TalentXBrand from "../components/TalentXBrand";
import { getDefaultRouteForUser } from "../utils/authRouting";
import {
  authContentVariants,
  authItemVariants,
  authPageVariants,
  authSidebarVariants,
} from "./authMotion";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const reduceMotion = useReducedMotion();
  const highlights = ["Hire Smarter", "Learn Faster", "Grow Careers", "Build Teams"];

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
      const user = {
        ...(res.data.user || {}),
        forcePasswordReset: Boolean(res.data.forcePasswordReset),
      };

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      navigate(getDefaultRouteForUser(user));
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-slate-100 px-4 py-6 sm:px-6 sm:py-10"
      initial={reduceMotion ? false : "hidden"}
      animate={reduceMotion ? undefined : "visible"}
      variants={authPageVariants}
    >
      {/* Background gradient blobs */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(79,70,229,0.18),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(59,130,246,0.15),transparent_32%),radial-gradient(circle_at_60%_80%,rgba(14,165,233,0.14),transparent_36%)]" />

      <div className="relative mx-auto grid w-full max-w-[72rem] grid-cols-1 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl sm:rounded-3xl lg:grid-cols-2">
        {/* ── Sidebar (desktop) ── */}
        <motion.section
          className="hidden bg-gradient-to-br from-[#4f2df4] via-[#3f63df] to-[#1588db] p-8 text-white lg:flex lg:flex-col lg:justify-between lg:p-12"
          initial={reduceMotion ? false : "hidden"}
          animate={reduceMotion ? undefined : "visible"}
          variants={authSidebarVariants}
        >
          <div>
            <motion.div variants={authItemVariants} className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
              <TalentXBrand theme="dark" size="sm" />
            </motion.div>

            <motion.h2 variants={authItemVariants} className="mt-8 text-3xl font-black leading-tight xl:text-4xl">
              One Platform for Students, Recruiters, and Placement Teams.
            </motion.h2>
            <motion.p variants={authItemVariants} className="mt-4 max-w-xl text-sm leading-relaxed text-cyan-100">
              Track opportunities, apply to top companies, and manage hiring pipelines with speed and confidence.
            </motion.p>
          </div>

          <motion.div variants={authContentVariants} className="space-y-4">
            <motion.div
              variants={authItemVariants}
              className="relative h-12 overflow-hidden rounded-xl border border-white/20 bg-white/10 px-5 xl:h-14"
            >
              <div className="ticker-track">
                {[...highlights, ...highlights].map((item, idx) => (
                  <span key={`${item}-${idx}`} className="ticker-item">
                    {item}
                  </span>
                ))}
              </div>
            </motion.div>

            <motion.div variants={authItemVariants} className="grid grid-cols-3 gap-3">
              <StatCard
                icon={<SchoolRoundedIcon sx={{ fontSize: 18 }} />}
                label="Students"
                value="10k+"
                reduceMotion={reduceMotion}
              />
              <StatCard
                icon={<BusinessCenterRoundedIcon sx={{ fontSize: 18 }} />}
                label="Recruiters"
                value="500+"
                reduceMotion={reduceMotion}
              />
              <StatCard
                icon={<TrendingUpRoundedIcon sx={{ fontSize: 18 }} />}
                label="Placements"
                value="95%"
                reduceMotion={reduceMotion}
              />
            </motion.div>
          </motion.div>
        </motion.section>

        {/* ── Form side ── */}
        <motion.section
          className="flex flex-col justify-center p-5 sm:p-8 md:p-10 lg:p-12"
          initial={reduceMotion ? false : "hidden"}
          animate={reduceMotion ? undefined : "visible"}
          variants={authContentVariants}
        >
          {/* Mobile branding */}
          <motion.div variants={authItemVariants} className="mb-6 lg:hidden">
            <div className="inline-flex rounded-xl bg-indigo-50 px-3 py-2.5 text-indigo-900">
              <TalentXBrand theme="light" size="sm" />
            </div>
          </motion.div>

          <motion.h2 variants={authItemVariants} className="text-2xl font-black text-slate-900 sm:text-3xl">
            Sign in
          </motion.h2>
          <motion.p variants={authItemVariants} className="mt-1.5 text-sm text-slate-500 sm:mt-2">
            Access your dashboard and continue your journey.
          </motion.p>

          {error && (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: -8 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 sm:mt-5"
            >
              {error}
            </motion.div>
          )}

          <motion.form onSubmit={handleLogin} className="mt-5 space-y-4 sm:mt-6 sm:space-y-5" variants={authContentVariants}>
            <motion.div variants={authItemVariants}>
              <label htmlFor="login-email" className="mb-1 block text-sm font-semibold text-slate-700">
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 sm:py-3 sm:text-base"
              />
            </motion.div>

            <motion.div variants={authItemVariants}>
              <label htmlFor="login-password" className="mb-1 block text-sm font-semibold text-slate-700">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="At least 8 characters"
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 pr-12 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 sm:py-3 sm:text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 transition-colors hover:text-slate-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <VisibilityOffRoundedIcon sx={{ fontSize: 20 }} />
                  ) : (
                    <VisibilityRoundedIcon sx={{ fontSize: 20 }} />
                  )}
                </button>
              </div>
            </motion.div>

            <motion.div variants={authItemVariants} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                Remember me
              </label>
              <Link to="/forgot-password" className="text-sm font-semibold text-indigo-700 hover:text-indigo-900">
                Forgot password?
              </Link>
            </motion.div>

            <motion.button
              variants={authItemVariants}
              type="submit"
              disabled={isLoading}
              whileHover={reduceMotion ? undefined : { y: -2 }}
              whileTap={reduceMotion ? undefined : { scale: 0.99 }}
              className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 disabled:cursor-not-allowed disabled:opacity-60 sm:py-3"
            >
              {isLoading ? "Signing in..." : "Sign in to TalentX"}
            </motion.button>
          </motion.form>

          <motion.div variants={authItemVariants} className="mt-5 space-y-1.5 sm:mt-6 sm:space-y-2">
            <p className="text-sm text-slate-600">
              Don't have an account?{" "}
              <Link to="/register" className="font-semibold text-indigo-700 hover:text-indigo-900">
                Create one
              </Link>
            </p>
            <p className="text-sm text-slate-600">
              Explore the platform{" "}
              <Link to="/" className="font-semibold text-indigo-700 hover:text-indigo-900">
                TalentX Home
              </Link>
            </p>
          </motion.div>
        </motion.section>
      </div>
    </motion.div>
  );
}

function StatCard({ icon, label, value, reduceMotion }) {
  return (
    <motion.div
      whileHover={reduceMotion ? undefined : { y: -4, scale: 1.02 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 backdrop-blur"
    >
      <p className="mb-1 inline-flex items-center gap-1 text-[0.65rem] font-semibold uppercase tracking-wide text-indigo-100 xl:text-xs">
        {icon}
        {label}
      </p>
      <p className="text-base font-black text-white xl:text-lg">{value}</p>
    </motion.div>
  );
}
