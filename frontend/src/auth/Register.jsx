import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import { FormControl, MenuItem, Select } from "@mui/material";
import toast from "react-hot-toast";
import API from "../api/axios";
import TalentXBrand from "../components/TalentXBrand";
import { LOGIN_ROUTE } from "../utils/authRouting";
import {
  authContentVariants,
  authItemVariants,
  authPageVariants,
  authSidebarVariants,
} from "./authMotion";

export default function Register() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [loading, setLoading] = useState(false);

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const handleRegister = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName || !trimmedEmail || !password || !role) {
      toast.error("All fields are required");
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    try {
      setLoading(true);

      await API.post("/auth/register", {
        name: trimmedName,
        email: trimmedEmail,
        password,
        role,
      });

      toast.success("Registration successful. Please login.");
      navigate(LOGIN_ROUTE);
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const fieldClass =
    "mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100";

  const registerSelectMenuProps = {
    PaperProps: {
      sx: {
        mt: 1,
        borderRadius: 2,
        border: "1px solid #dbe2ef",
        boxShadow: "0 12px 28px rgba(15, 23, 42, 0.15)",
        "& .MuiMenuItem-root": {
          fontSize: "0.9rem",
          borderRadius: 1,
          mx: 0.5,
          my: 0.25,
          minHeight: 36,
        },
        "& .MuiMenuItem-root:hover": {
          backgroundColor: "#eef2ff",
        },
        "& .MuiMenuItem-root.Mui-selected": {
          backgroundColor: "#e0e7ff",
          color: "#3730a3",
          fontWeight: 700,
        },
        "& .MuiMenuItem-root.Mui-selected:hover": {
          backgroundColor: "#c7d2fe",
        },
      },
    },
  };

  const registerSelectSx = {
    mt: 1,
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: "#cbd5e1",
      borderWidth: "1px",
      borderRadius: "0.75rem",
    },
    "&:hover .MuiOutlinedInput-notchedOutline": {
      borderColor: "#a5b4fc",
    },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
      borderColor: "#6366f1",
      borderWidth: "2px",
    },
    "& .MuiSelect-select": {
      py: "12px",
      px: "16px",
      fontSize: "0.875rem",
      fontWeight: 500,
      color: "#0f172a",
      background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
      borderRadius: "0.75rem",
    },
    "& .MuiSelect-icon": {
      color: "#64748b",
      right: 10,
    },
  };

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-indigo-100 px-4 py-8 sm:px-6 lg:px-8"
      initial={reduceMotion ? false : "hidden"}
      animate={reduceMotion ? undefined : "visible"}
      variants={authPageVariants}
    >
      <div className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl md:grid-cols-2">
        <motion.aside
          className="relative hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-cyan-600 p-10 text-white md:flex md:flex-col md:justify-between"
          initial={reduceMotion ? false : "hidden"}
          animate={reduceMotion ? undefined : "visible"}
          variants={authSidebarVariants}
        >
          <div>
            <motion.div variants={authItemVariants} className="mb-6 rounded-2xl bg-white/15 px-4 py-3 backdrop-blur-sm">
              <TalentXBrand theme="dark" size="sm" />
            </motion.div>

            <motion.h1 variants={authItemVariants} className="text-4xl font-bold leading-tight">
              Welcome to TalentX
            </motion.h1>

            <motion.p variants={authItemVariants} className="mt-4 text-base leading-relaxed text-indigo-100">
              A modern platform that connects students with recruiters and helps teams hire faster.
            </motion.p>

            <motion.div variants={authContentVariants} className="mt-8 space-y-2 text-sm text-indigo-100">
              <motion.p variants={authItemVariants}>Career-first onboarding</motion.p>
              <motion.p variants={authItemVariants}>Smart applications and role matching</motion.p>
              <motion.p variants={authItemVariants}>Progress tracking from one dashboard</motion.p>
            </motion.div>
          </div>

          <motion.div
            variants={authItemVariants}
            whileHover={reduceMotion ? undefined : { y: -4 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm"
          >
            <p className="text-sm text-indigo-50">Trusted by students, colleges, and recruiters.</p>
          </motion.div>
        </motion.aside>

        <motion.section
          className="p-6 sm:p-10 md:p-12"
          initial={reduceMotion ? false : "hidden"}
          animate={reduceMotion ? undefined : "visible"}
          variants={authContentVariants}
        >
          <div className="mx-auto w-full max-w-md">
            <motion.h2 variants={authItemVariants} className="text-3xl font-bold text-slate-900">
              Create your account
            </motion.h2>
            <motion.p variants={authItemVariants} className="mt-2 text-sm text-slate-500">
              Start your TalentX journey in a minute.
            </motion.p>

            <motion.form onSubmit={handleRegister} className="mt-8 space-y-5" variants={authContentVariants}>
              <motion.div variants={authItemVariants}>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Full Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  className={fieldClass}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </motion.div>

              <motion.div variants={authItemVariants}>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email Address</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  className={fieldClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </motion.div>

              <motion.div variants={authItemVariants}>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Password</label>
                <input
                  type="password"
                  placeholder="At least 8 characters"
                  className={fieldClass}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </motion.div>

              <motion.div variants={authItemVariants}>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Register As</label>
                <FormControl fullWidth size="small">
                  <Select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    IconComponent={KeyboardArrowDownRoundedIcon}
                    MenuProps={registerSelectMenuProps}
                    sx={registerSelectSx}
                  >
                    <MenuItem value="student">Student</MenuItem>
                    <MenuItem value="recruiter">Recruiter</MenuItem>
                  </Select>
                </FormControl>
              </motion.div>

              <motion.button
                variants={authItemVariants}
                type="submit"
                disabled={loading}
                whileHover={reduceMotion ? undefined : { y: -2 }}
                whileTap={reduceMotion ? undefined : { scale: 0.99 }}
                className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Creating account..." : "Register"}
              </motion.button>
            </motion.form>

            <motion.p variants={authItemVariants} className="mt-6 text-sm text-slate-600">
              Already have an account?{" "}
              <Link to={LOGIN_ROUTE} className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
                Login
              </Link>
            </motion.p>
            <motion.p variants={authItemVariants} className="mt-2 text-sm text-slate-600">
              Explore the platform{" "}
              <Link to="/" className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
                TalentX Home
              </Link>
            </motion.p>
          </div>
        </motion.section>
      </div>
    </motion.div>
  );
}
