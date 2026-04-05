import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { revealContainer, revealItem } from "./animations";

export default function TrustSection({ trust, logoDevToken }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      id="trust"
      aria-label="Trusted institutions"
      className="landing-section py-10 sm:py-14 lg:py-20"
      initial={reduceMotion ? false : "hidden"}
      whileInView={reduceMotion ? undefined : "visible"}
      viewport={{ once: true, amount: 0.1 }}
      variants={revealContainer}
    >
      <div className="mx-auto max-w-7xl rounded-2xl border border-slate-200 bg-white px-4 py-6 shadow-sm sm:rounded-[2rem] sm:px-6 sm:py-8 lg:px-10 lg:py-10">
        <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-8 xl:grid-cols-[20rem_minmax(0,1fr)]">
          {/* Left column — section intro */}
          <motion.div variants={revealItem} className="space-y-3 sm:space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 sm:text-sm">
              {trust.eyebrow}
            </p>
            <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl lg:text-4xl">
              {trust.title}
            </h2>
            <p className="text-sm leading-7 text-slate-500 sm:text-base sm:leading-8">
              {trust.description}
            </p>
          </motion.div>

          {/* Right column — logos + pillars */}
          <div className="space-y-6 sm:space-y-8">
            {/* College logos grid */}
            <motion.div
              variants={revealItem}
              className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4"
            >
              {trust.colleges.map((college, index) => (
                <CollegeLogoCard
                  key={college.domain}
                  college={college}
                  logoDevToken={logoDevToken}
                  index={index}
                  reduceMotion={reduceMotion}
                />
              ))}
            </motion.div>

            {/* Trust pillars */}
            <motion.div variants={revealItem} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {trust.pillars.map((pillar) => (
                <motion.div
                  key={pillar.title}
                  whileHover={reduceMotion ? undefined : { y: -6 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md sm:rounded-[1.5rem] sm:p-5"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 sm:h-11 sm:w-11 sm:rounded-2xl">
                    <pillar.icon sx={{ fontSize: 20 }} />
                  </span>
                  <h3 className="mt-3 text-base font-bold text-slate-950 sm:mt-4 sm:text-lg">
                    {pillar.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-6 text-slate-500 sm:mt-2 sm:leading-7">
                    {pillar.text}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function CollegeLogoCard({ college, logoDevToken, index, reduceMotion }) {
  const [showFallback, setShowFallback] = useState(false);
  const imageSrc = !showFallback ? buildLogoDevUrl(college.domain, logoDevToken) : "";

  return (
    <motion.article
      variants={revealItem}
      whileHover={reduceMotion ? undefined : { y: -4, scale: 1.01 }}
      transition={{ duration: 0.2, ease: "easeOut", delay: index * 0.02 }}
      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 shadow-sm transition-shadow hover:shadow-md sm:gap-4 sm:rounded-[1.5rem] sm:px-4 sm:py-4"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm sm:h-[4.5rem] sm:w-[4.5rem] sm:rounded-[1.25rem] sm:shadow-[0_16px_32px_-24px_rgba(15,23,42,0.45)]">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={`${college.name} logo`}
            loading="lazy"
            referrerPolicy="origin"
            className="h-8 w-8 object-contain sm:h-12 sm:w-12"
            onError={() => setShowFallback(true)}
          />
        ) : (
          <span className="text-sm font-black text-indigo-600 sm:text-lg">
            {createInitials(college.name)}
          </span>
        )}
      </span>

      <div className="min-w-0">
        <p className="truncate text-sm font-bold tracking-tight text-slate-950 sm:text-[1.05rem]">
          {college.name}
        </p>
        <p className="text-[0.625rem] font-medium uppercase tracking-[0.22em] text-slate-400 sm:text-xs sm:tracking-[0.26em]">
          {college.city}
        </p>
      </div>
    </motion.article>
  );
}

function buildLogoDevUrl(domain, token) {
  const normalizedDomain = String(domain || "").trim().toLowerCase();
  if (!normalizedDomain) return "";

  if (!token) {
    return `https://img.logo.dev/${normalizedDomain}`;
  }

  const params = new URLSearchParams({
    token,
    size: "72",
    format: "png",
    retina: "true",
    fallback: "404",
  });

  return `https://img.logo.dev/${normalizedDomain}?${params.toString()}`;
}

function createInitials(value) {
  return value
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}
