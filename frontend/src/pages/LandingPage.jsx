import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useInView, useReducedMotion } from "framer-motion";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import SouthRoundedIcon from "@mui/icons-material/SouthRounded";
import API from "../api/axios";
import TalentXBrand, { TalentXMark } from "../components/TalentXBrand";
import { landingContent } from "./landingContent";

const toneClasses = {
  indigo: {
    badge: "bg-indigo-100 text-indigo-700",
    button: "bg-indigo-700 text-white hover:bg-indigo-800",
  },
  sky: {
    badge: "bg-sky-100 text-sky-700",
    button: "bg-sky-700 text-white hover:bg-sky-800",
  },
  amber: {
    badge: "bg-amber-100 text-amber-700",
    button: "bg-amber-500 text-slate-950 hover:bg-amber-400",
  },
};

const sectionViewport = { once: true, amount: 0.2 };

const revealContainer = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.65,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.12,
    },
  },
};

const revealItem = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export default function LandingPage() {
  const [logoDevToken, setLogoDevToken] = useState("");
  const reduceMotion = useReducedMotion();
  const { navLinks, hero, heroPanels, impactStats, audienceCards, trust, testimonial, finalCta, footer, accentIcons } =
    landingContent;

  useEffect(() => {
    let isActive = true;

    API.get("/public/branding")
      .then((response) => {
        if (!isActive) return;
        setLogoDevToken(String(response.data?.logoDevToken || "").trim());
      })
      .catch(() => {
        if (!isActive) return;
        setLogoDevToken("");
      });

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#f8f9fc] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="max-w-[360px]">
            <TalentXBrand theme="light" size="sm" />
          </Link>

          <nav className="hidden items-center gap-8 lg:flex">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-600 transition hover:text-slate-900"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 sm:px-5"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 sm:px-5"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section id="hero" className="px-4 pb-14 pt-10 sm:px-6 lg:px-8 lg:pb-20 lg:pt-14">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(420px,520px)] lg:items-center">
            <motion.div
              className="max-w-2xl"
              initial={reduceMotion ? false : "hidden"}
              animate={reduceMotion ? undefined : "visible"}
              variants={revealContainer}
            >
              <motion.p
                variants={revealItem}
                className="text-sm font-semibold uppercase tracking-[0.26em] text-indigo-600"
              >
                {hero.eyebrow}
              </motion.p>
              <motion.h1
                variants={revealItem}
                className="mt-5 text-5xl font-black tracking-tight text-slate-950 sm:text-6xl"
              >
                {hero.title}
              </motion.h1>
              <motion.p
                variants={revealItem}
                className="mt-6 max-w-xl text-lg leading-9 text-slate-500 sm:text-[1.35rem]"
              >
                {hero.description}
              </motion.p>

              <motion.div variants={revealItem} className="mt-8 flex flex-wrap gap-3">
                <Link
                  to={hero.primaryCta.to}
                  className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-7 py-3 text-base font-bold text-slate-950 transition hover:bg-amber-300"
                >
                  {hero.primaryCta.label}
                  <ArrowOutwardRoundedIcon sx={{ fontSize: 18 }} />
                </Link>
                <Link
                  to={hero.secondaryCta.to}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  <PlayArrowRoundedIcon sx={{ fontSize: 18 }} />
                  {hero.secondaryCta.label}
                </Link>
              </motion.div>

              <motion.div variants={revealItem} className="mt-7 flex flex-wrap gap-3">
                {hero.highlights.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm"
                  >
                    {item}
                  </span>
                ))}
              </motion.div>
            </motion.div>

            <motion.div
              className="relative mx-auto w-full max-w-[520px]"
              initial={reduceMotion ? false : { opacity: 0, x: 30 }}
              animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
            >
              <div className="relative h-[520px] overflow-hidden rounded-[2.2rem] bg-white p-4 shadow-[0_35px_80px_-38px_rgba(15,23,42,0.45)] sm:p-6">
                <motion.div
                  className="absolute inset-x-4 bottom-4 top-28 rounded-[2rem] bg-gradient-to-br from-[#4736cb] via-[#3e42c9] to-[#2f81d8] sm:inset-x-6"
                  animate={
                    reduceMotion
                      ? undefined
                      : {
                          scale: [1, 1.015, 1],
                          opacity: [0.98, 1, 0.98],
                        }
                  }
                  transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                />
                <div
                  className="pointer-events-none absolute inset-x-8 bottom-8 top-32 rounded-[1.8rem] opacity-25"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.65) 1px, transparent 0)",
                    backgroundSize: "22px 22px",
                  }}
                />

                <div className="relative h-full">
                  {heroPanels.map((panel, index) => (
                    <HeroPanel key={panel.eyebrow} panel={panel} index={index} reduceMotion={reduceMotion} />
                  ))}

                  <motion.div
                    className="absolute bottom-0 right-2 flex items-center gap-3 rounded-[1.4rem] border border-white/50 bg-white/95 px-4 py-3 shadow-lg sm:right-4"
                    animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
                  >
                    <div className="flex -space-x-2">
                      {accentIcons.map((Icon, index) => (
                        <span
                          key={index}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-slate-700"
                        >
                          <Icon sx={{ fontSize: 18 }} />
                        </span>
                      ))}
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Live flow</p>
                      <p className="text-sm font-semibold text-slate-900">Students, recruiters, and campuses aligned</p>
                    </div>
                  </motion.div>
                </div>
              </div>

            </motion.div>
          </div>
        </section>

        <motion.section
          className="px-4 pb-4 sm:px-6 lg:px-8"
          initial={reduceMotion ? false : "hidden"}
          whileInView={reduceMotion ? undefined : "visible"}
          viewport={sectionViewport}
          variants={revealContainer}
        >
          <div className="mx-auto max-w-7xl border-y border-slate-200 bg-white/70 px-6 py-8 backdrop-blur sm:px-10 lg:px-14">
            <div className="grid gap-8 md:grid-cols-3 md:gap-10">
              {impactStats.map((stat) => (
                <motion.div key={stat.label} variants={revealItem}>
                  <CountUpStat
                    value={stat.value}
                    suffix={stat.suffix}
                    label={stat.label}
                    reduceMotion={reduceMotion}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section
          className="px-4 py-8 sm:px-6 lg:px-8 lg:py-12"
          initial={reduceMotion ? false : "hidden"}
          whileInView={reduceMotion ? undefined : "visible"}
          viewport={sectionViewport}
          variants={revealContainer}
        >
          <div className="mx-auto max-w-6xl divide-y divide-slate-200 rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            {audienceCards.map((card) => (
              <AudienceRow key={card.id} card={card} />
            ))}
          </div>
        </motion.section>

        <motion.section
          id="trust"
          className="px-4 py-12 sm:px-6 lg:px-8 lg:py-20"
          initial={reduceMotion ? false : "hidden"}
          whileInView={reduceMotion ? undefined : "visible"}
          viewport={sectionViewport}
          variants={revealContainer}
        >
          <div className="mx-auto grid max-w-7xl gap-8 rounded-[2rem] border border-slate-200 bg-white px-6 py-8 shadow-sm lg:grid-cols-[320px_minmax(0,1fr)] lg:px-10 lg:py-10">
            <motion.div variants={revealItem} className="space-y-5">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">{trust.eyebrow}</p>
              <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{trust.title}</h2>
              <p className="text-base leading-8 text-slate-500">{trust.description}</p>
            </motion.div>

            <div className="space-y-8">
              <motion.div variants={revealItem} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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

              <motion.div variants={revealItem} className="grid gap-4 lg:grid-cols-3">
                {trust.pillars.map((pillar) => (
                  <motion.div
                    key={pillar.title}
                    whileHover={reduceMotion ? undefined : { y: -6 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="rounded-[1.5rem] border border-slate-200 bg-white p-5"
                  >
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
                      <pillar.icon sx={{ fontSize: 22 }} />
                    </span>
                    <h3 className="mt-4 text-lg font-bold text-slate-950">{pillar.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-500">{pillar.text}</p>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </motion.section>

        <motion.section
          id="stories"
          className="px-4 py-12 sm:px-6 lg:px-8 lg:py-20"
          initial={reduceMotion ? false : "hidden"}
          whileInView={reduceMotion ? undefined : "visible"}
          viewport={sectionViewport}
          variants={revealContainer}
        >
          <div className="mx-auto max-w-6xl rounded-[2rem] bg-[#fbfcff] px-6 py-8 sm:px-8 lg:px-10 lg:py-12">
            <motion.p variants={revealItem} className="text-center text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
              {testimonial.eyebrow}
            </motion.p>
            <motion.h2
              variants={revealItem}
              className="mt-4 text-center text-3xl font-black tracking-tight text-slate-950 sm:text-4xl"
            >
              A landing page that leads naturally into the right workspace
            </motion.h2>

            <motion.div variants={revealItem} className="mt-8 flex flex-wrap justify-center gap-3">
              {testimonial.badges.map((badge) => (
                <span
                  key={badge}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600"
                >
                  {badge}
                </span>
              ))}
            </motion.div>

            <motion.div
              variants={revealItem}
              className="mt-10 grid gap-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:p-8"
            >
              <div className="flex flex-col justify-between gap-6">
                <div>
                  <span className="text-7xl font-black leading-none text-amber-400">"</span>
                  <p className="mt-4 text-3xl font-medium leading-[1.35] tracking-tight text-slate-500">
                    {testimonial.quote}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
                    <TalentXMark size="sm" />
                  </span>
                  <div>
                    <p className="text-lg font-bold text-slate-950">{testimonial.name}</p>
                    <p className="text-sm leading-6 text-slate-500">{testimonial.role}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                <StoryCard
                  title="Landing-first entry"
                  text="Visitors understand the platform before they hit a login wall, which makes the first visit feel intentional and product-led."
                  reduceMotion={reduceMotion}
                />
                <StoryCard
                  title="Clear audience paths"
                  text="Employers, universities, and students each get copy and CTAs that match how they use TalentX."
                  reduceMotion={reduceMotion}
                />
                <StoryCard
                  title="Original college identity"
                  text="The trust section now uses real Indian institutions and requests their logo images through logo.dev with the publishable token from your backend env."
                  reduceMotion={reduceMotion}
                />
              </div>
            </motion.div>
          </div>
        </motion.section>

        <motion.section
          id="cta"
          className="px-4 pb-14 pt-4 sm:px-6 lg:px-8 lg:pb-20"
          initial={reduceMotion ? false : "hidden"}
          whileInView={reduceMotion ? undefined : "visible"}
          viewport={sectionViewport}
          variants={revealContainer}
        >
          <motion.div
            variants={revealItem}
            className="mx-auto max-w-7xl rounded-[2.2rem] bg-[#2f3341] px-6 py-10 text-white shadow-[0_40px_90px_-42px_rgba(15,23,42,0.7)] sm:px-8 lg:px-10"
          >
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">Ready to launch</p>
                <h2 className="mt-4 max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">
                  {finalCta.title}
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">{finalCta.description}</p>
              </div>

              <div className="flex flex-col gap-3">
                <Link
                  to={finalCta.primaryCta.to}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-200"
                >
                  {finalCta.primaryCta.label}
                  <ArrowOutwardRoundedIcon sx={{ fontSize: 18 }} />
                </Link>
                <Link
                  to={finalCta.secondaryCta.to}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  {finalCta.secondaryCta.label}
                </Link>
              </div>
            </div>
          </motion.div>
        </motion.section>
      </main>

      <footer className="bg-[#2f3341] px-4 pb-10 pt-8 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl border-t border-white/10 pt-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_repeat(3,minmax(0,1fr))]">
            <div className="space-y-4">
              <TalentXBrand theme="muted" size="sm" className="max-w-[360px]" />
              <p className="max-w-md text-sm leading-7 text-slate-300">{footer.summary}</p>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {footer.contact.label}
                </p>
                <p className="mt-2 text-base font-semibold text-white">{footer.contact.email}</p>
                <p className="mt-1 text-sm leading-6 text-slate-300">{footer.contact.note}</p>
              </div>
            </div>

            {footer.groups.map((group) => (
              <div key={group.title}>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">{group.title}</p>
                <ul className="mt-4 space-y-3">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <FooterLink link={link} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <p>TalentX landing-first experience for students, employers, and universities.</p>
            <a href="#hero" className="inline-flex items-center gap-2 font-semibold text-white transition hover:text-slate-300">
              Back to top
              <SouthRoundedIcon sx={{ fontSize: 18 }} />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function AudienceRow({ card }) {
  const tone = toneClasses[card.tone] || toneClasses.indigo;

  return (
    <motion.section variants={revealItem} id={card.id} className="grid gap-4 px-5 py-8 sm:px-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-10 lg:py-10">
      <div className="flex items-start lg:items-center">
        <p className="text-3xl font-semibold uppercase tracking-tight text-slate-900">{card.eyebrow}</p>
      </div>

      <div>
        <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${tone.badge}`}>
          <card.icon sx={{ fontSize: 18 }} />
          {card.eyebrow}
        </span>
        <h2 className="mt-5 max-w-3xl text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{card.title}</h2>
        <p className="mt-4 max-w-3xl text-lg leading-9 text-slate-500">{card.description}</p>
        <div className="mt-6">
          <ActionLink
            action={card.cta}
            className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-base font-semibold transition ${tone.button}`}
          >
            {card.cta.label}
          </ActionLink>
        </div>
      </div>
    </motion.section>
  );
}

function HeroPanel({ panel, index, reduceMotion }) {
  return (
    <motion.article
      className={`absolute rounded-[1.7rem] p-5 sm:p-6 ${panel.className}`}
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
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
        <panel.icon sx={{ fontSize: 24 }} />
      </span>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{panel.eyebrow}</p>
      <p className="mt-3 text-lg font-bold leading-7 text-slate-900">{panel.title}</p>
    </motion.article>
  );
}

function StoryCard({ title, text, reduceMotion }) {
  return (
    <motion.article
      whileHover={reduceMotion ? undefined : { y: -4 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5"
    >
      <h3 className="text-lg font-bold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-500">{text}</p>
    </motion.article>
  );
}

function CollegeLogoCard({ college, logoDevToken, index, reduceMotion }) {
  const [showFallback, setShowFallback] = useState(false);
  const imageSrc = !showFallback ? buildLogoDevUrl(college.domain, logoDevToken) : "";

  return (
    <motion.article
      variants={revealItem}
      whileHover={reduceMotion ? undefined : { y: -6, scale: 1.01 }}
      transition={{ duration: 0.2, ease: "easeOut", delay: index * 0.02 }}
      className="flex items-center gap-4 rounded-[1.7rem] border border-slate-200 bg-slate-50 px-4 py-4 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.35)]"
    >
      <span className="flex h-[72px] w-[72px] items-center justify-center rounded-[1.6rem] bg-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.45)]">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={`${college.name} logo`}
            loading="lazy"
            referrerPolicy="origin"
            className="h-12 w-12 object-contain"
            onError={() => setShowFallback(true)}
          />
        ) : (
          <span className="text-lg font-black text-indigo-600">{createInitials(college.name)}</span>
        )}
      </span>

      <div className="min-w-0">
        <p className="truncate text-[1.15rem] font-bold tracking-tight text-slate-950">{college.name}</p>
        <p className="text-xs font-medium uppercase tracking-[0.26em] text-slate-400">{college.city}</p>
        <p className="mt-1 text-[0.95rem] font-medium uppercase tracking-[0.22em] text-slate-400">
          Campus-ready workflow
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

function ActionLink({ action, className, children }) {
  if (action.to) {
    return (
      <Link to={action.to} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <a href={action.href} className={className}>
      {children}
    </a>
  );
}

function FooterLink({ link }) {
  const className = "text-sm text-slate-300 transition hover:text-white";

  if (link.to) {
    return (
      <Link to={link.to} className={className}>
        {link.label}
      </Link>
    );
  }

  return (
    <a href={link.href} className={className}>
      {link.label}
    </a>
  );
}

function createInitials(value) {
  return value
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function CountUpStat({ value, suffix = "", label, reduceMotion }) {
  const statRef = useRef(null);
  const isInView = useInView(statRef, { once: true, amount: 0.65 });
  const [displayValue, setDisplayValue] = useState(reduceMotion ? value : 0);

  useEffect(() => {
    if (reduceMotion) {
      setDisplayValue(value);
      return;
    }

    if (!isInView) {
      return;
    }

    let frameId = 0;
    let startTime = 0;
    const durationMs = 1700;

    const tick = (timestamp) => {
      if (!startTime) {
        startTime = timestamp;
      }

      const progress = Math.min((timestamp - startTime) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(value * eased));

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [isInView, reduceMotion, value]);

  return (
    <div ref={statRef} className="space-y-2">
      <p className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
        {formatIndianCount(displayValue)}
        {suffix}
      </p>
      <p className="text-lg font-medium text-slate-500">{label}</p>
    </div>
  );
}

function formatIndianCount(value) {
  return Number(value || 0).toLocaleString("en-IN");
}
