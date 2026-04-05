import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import TalentXBrand from "../../components/TalentXBrand";

export default function Navbar({ navLinks }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleDrawer = useCallback(() => setDrawerOpen((prev) => !prev), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  return (
    <header
      id="navbar"
      className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        {/* ── Brand ── */}
        <Link to="/" className="shrink-0 max-w-[20rem]" onClick={closeDrawer}>
          <TalentXBrand theme="light" size="sm" />
        </Link>

        {/* ── Desktop nav ── */}
        <nav className="hidden items-center gap-8 lg:flex" aria-label="Main navigation">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-slate-600 transition-colors duration-200 hover:text-slate-900"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* ── CTA buttons + hamburger ── */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/login"
            className="hidden rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900 sm:inline-flex sm:px-5"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-slate-700 sm:px-5"
          >
            Sign up
          </Link>

          {/* Hamburger — visible below lg */}
          <button
            type="button"
            onClick={toggleDrawer}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 transition-colors hover:bg-slate-100 lg:hidden"
            aria-label={drawerOpen ? "Close menu" : "Open menu"}
            aria-expanded={drawerOpen}
          >
            {drawerOpen ? (
              <CloseRoundedIcon sx={{ fontSize: 24 }} />
            ) : (
              <MenuRoundedIcon sx={{ fontSize: 24 }} />
            )}
          </button>
        </div>
      </div>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 top-[3.5rem] z-40 bg-slate-900/30 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeDrawer}
              aria-hidden="true"
            />

            {/* Drawer panel */}
            <motion.nav
              className="fixed right-0 top-[3.5rem] z-50 flex h-[calc(100dvh-3.5rem)] w-[min(20rem,85vw)] flex-col gap-1 overflow-y-auto bg-white p-5 shadow-2xl lg:hidden"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              aria-label="Mobile navigation"
            >
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={closeDrawer}
                  className="flex items-center rounded-xl px-4 py-3 text-base font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
                >
                  {link.label}
                </a>
              ))}

              <hr className="my-3 border-slate-200" />

              <Link
                to="/login"
                onClick={closeDrawer}
                className="flex items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-base font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={closeDrawer}
                className="flex items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-slate-700"
              >
                Sign up
              </Link>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
