import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import { revealContainer, revealItem } from "./animations";

export default function CtaSection({ finalCta }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      id="cta"
      aria-label="Call to action"
      className="landing-section pb-10 pt-2 sm:pb-14 sm:pt-4 lg:pb-20"
      initial={reduceMotion ? false : "hidden"}
      whileInView={reduceMotion ? undefined : "visible"}
      viewport={{ once: true, amount: 0.2 }}
      variants={revealContainer}
    >
      <motion.div
        variants={revealItem}
        className="mx-auto max-w-7xl rounded-2xl bg-[#2f3341] px-5 py-8 text-white shadow-[0_40px_90px_-42px_rgba(15,23,42,0.7)] sm:rounded-[2rem] sm:px-8 sm:py-10 lg:px-10"
      >
        <div className="grid gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_16.25rem] lg:items-center">
          {/* Copy */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 sm:text-sm">
              Ready to launch
            </p>
            <h2 className="mt-3 max-w-3xl text-xl font-black tracking-tight sm:mt-4 sm:text-2xl lg:text-3xl xl:text-4xl">
              {finalCta.title}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:mt-4 sm:text-base sm:leading-8">
              {finalCta.description}
            </p>
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link
              to={finalCta.primaryCta.to}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-slate-900 transition-all duration-200 hover:bg-slate-200 hover:shadow-lg"
            >
              {finalCta.primaryCta.label}
              <ArrowOutwardRoundedIcon sx={{ fontSize: 18 }} />
            </Link>
            <Link
              to={finalCta.secondaryCta.to}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/15"
            >
              {finalCta.secondaryCta.label}
            </Link>
          </div>
        </div>
      </motion.div>
    </motion.section>
  );
}
