import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import { revealContainer, revealItem } from "./animations";

export default function HeroSection({ hero, heroPanels, accentIcons }) {
  const reduceMotion = useReducedMotion();

  return (
    <section id="hero" className="landing-section pb-10 pt-8 sm:pb-14 sm:pt-10 lg:pb-20 lg:pt-14">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        {/* ── Left: Copy ── */}
        <motion.div
          className="max-w-2xl"
          initial={reduceMotion ? false : "hidden"}
          animate={reduceMotion ? undefined : "visible"}
          variants={revealContainer}
        >
          <motion.p
            variants={revealItem}
            className="text-xs font-semibold uppercase tracking-[0.26em] text-indigo-600 sm:text-sm"
          >
            {hero.eyebrow}
          </motion.p>

          <motion.h1
            variants={revealItem}
            className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:mt-5 sm:text-5xl lg:text-[3.5rem] lg:leading-[1.1] xl:text-6xl"
          >
            {hero.title}
          </motion.h1>

          <motion.p
            variants={revealItem}
            className="mt-4 max-w-xl text-base leading-7 text-slate-500 sm:mt-6 sm:text-lg sm:leading-8 lg:text-xl lg:leading-9"
          >
            {hero.description}
          </motion.p>

          {/* CTA buttons */}
          <motion.div variants={revealItem} className="mt-6 flex flex-wrap gap-3 sm:mt-8">
            <Link
              to={hero.primaryCta.to}
              className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-6 py-3 text-sm font-bold text-slate-950 transition-all duration-200 hover:bg-amber-300 hover:shadow-lg hover:shadow-amber-400/25 sm:px-7 sm:text-base"
            >
              {hero.primaryCta.label}
              <ArrowOutwardRoundedIcon sx={{ fontSize: 18 }} />
            </Link>
            <Link
              to={hero.secondaryCta.to}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-all duration-200 hover:border-slate-400 hover:bg-slate-50 sm:px-6 sm:text-base"
            >
              <PlayArrowRoundedIcon sx={{ fontSize: 18 }} />
              {hero.secondaryCta.label}
            </Link>
          </motion.div>

          {/* Highlight pills */}
          <motion.div variants={revealItem} className="mt-5 flex flex-wrap gap-2 sm:mt-7 sm:gap-3">
            {hero.highlights.map((item) => (
              <span
                key={item}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm sm:px-4 sm:py-2 sm:text-sm"
              >
                {item}
              </span>
            ))}
          </motion.div>
        </motion.div>

        {/* ── Right: Animated visual (hidden on mobile) ── */}
        <motion.div
          className="relative mx-auto hidden w-full max-w-[32.5rem] md:block"
          initial={reduceMotion ? false : { opacity: 0, x: 30 }}
          animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        >
          <div className="relative aspect-square max-h-[32.5rem] overflow-hidden rounded-[2rem] bg-white p-4 shadow-[0_35px_80px_-38px_rgba(15,23,42,0.45)] sm:rounded-[2.2rem] sm:p-6">
            {/* Gradient background */}
            <motion.div
              className="absolute inset-x-4 bottom-4 top-28 rounded-[1.75rem] bg-gradient-to-br from-[#4736cb] via-[#3e42c9] to-[#2f81d8] sm:inset-x-6 sm:rounded-[2rem]"
              animate={
                reduceMotion
                  ? undefined
                  : { scale: [1, 1.015, 1], opacity: [0.98, 1, 0.98] }
              }
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Dot pattern overlay */}
            <div
              className="pointer-events-none absolute inset-x-8 bottom-8 top-32 rounded-[1.5rem] opacity-25 sm:rounded-[1.8rem]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.65) 1px, transparent 0)",
                backgroundSize: "22px 22px",
              }}
            />

            {/* Floating panels */}
            <div className="relative h-full">
              {heroPanels.map((panel, index) => (
                <HeroPanel
                  key={panel.eyebrow}
                  panel={panel}
                  index={index}
                  reduceMotion={reduceMotion}
                />
              ))}

              {/* Live flow badge */}
              <motion.div
                className="absolute bottom-0 right-2 flex items-center gap-3 rounded-[1.25rem] border border-white/50 bg-white/95 px-3 py-2.5 shadow-lg sm:right-4 sm:rounded-[1.4rem] sm:px-4 sm:py-3"
                animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
              >
                <div className="flex -space-x-2">
                  {accentIcons.map((Icon, index) => (
                    <span
                      key={index}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-slate-700 sm:h-10 sm:w-10"
                    >
                      <Icon sx={{ fontSize: 16 }} />
                    </span>
                  ))}
                </div>
                <div className="min-w-0">
                  <p className="text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-slate-400 sm:text-xs">
                    Live flow
                  </p>
                  <p className="text-xs font-semibold text-slate-900 sm:text-sm">
                    Students, recruiters, and campuses aligned
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function HeroPanel({ panel, index, reduceMotion }) {
  return (
    <motion.article
      className={`absolute rounded-[1.5rem] p-4 sm:rounded-[1.7rem] sm:p-5 ${panel.className}`}
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      animate={
        reduceMotion
          ? undefined
          : {
              opacity: 1,
              y: [0, index % 2 === 0 ? -10 : -6, 0],
            }
      }
      transition={{
        opacity: { duration: 0.45, delay: 0.2 + index * 0.12 },
        y: { duration: 5.2 + index, repeat: Infinity, ease: "easeInOut", delay: index * 0.2 },
      }}
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white sm:h-12 sm:w-12 sm:rounded-2xl">
        <panel.icon sx={{ fontSize: 22 }} />
      </span>
      <p className="mt-3 text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-slate-400 sm:mt-5 sm:text-xs">
        {panel.eyebrow}
      </p>
      <p className="mt-2 text-sm font-bold leading-6 text-slate-900 sm:mt-3 sm:text-lg sm:leading-7">
        {panel.title}
      </p>
    </motion.article>
  );
}
