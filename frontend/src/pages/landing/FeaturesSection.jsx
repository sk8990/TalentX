import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import { revealContainer, revealItem } from "./animations";

const toneClasses = {
  indigo: {
    badge: "bg-indigo-100 text-indigo-700",
    card: "hover:border-indigo-200 hover:shadow-indigo-100/50",
    iconBg: "bg-indigo-100 text-indigo-700",
    button: "bg-indigo-700 text-white hover:bg-indigo-800",
  },
  sky: {
    badge: "bg-sky-100 text-sky-700",
    card: "hover:border-sky-200 hover:shadow-sky-100/50",
    iconBg: "bg-sky-100 text-sky-700",
    button: "bg-sky-700 text-white hover:bg-sky-800",
  },
  amber: {
    badge: "bg-amber-100 text-amber-700",
    card: "hover:border-amber-200 hover:shadow-amber-100/50",
    iconBg: "bg-amber-100 text-amber-700",
    button: "bg-amber-500 text-slate-950 hover:bg-amber-400",
  },
};

export default function FeaturesSection({ features }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      id="features"
      aria-label="Platform features"
      className="landing-section py-10 sm:py-14 lg:py-20"
      initial={reduceMotion ? false : "hidden"}
      whileInView={reduceMotion ? undefined : "visible"}
      viewport={{ once: true, amount: 0.1 }}
      variants={revealContainer}
    >
      <div className="mx-auto max-w-7xl">
        {/* Section header */}
        <motion.div variants={revealItem} className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-600 sm:text-sm">
            Built For Every Stakeholder
          </p>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:mt-4 sm:text-3xl lg:text-4xl">
            One platform, three powerful experiences
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500 sm:mt-4 sm:text-base lg:text-lg">
            Whether you're hiring, studying, or managing placements — TalentX adapts to your workflow.
          </p>
        </motion.div>

        {/* Feature cards grid */}
        <div className="mt-8 grid gap-5 sm:mt-10 sm:gap-6 md:grid-cols-2 lg:mt-14 lg:grid-cols-3 lg:gap-8">
          {features.map((feature) => {
            const tone = toneClasses[feature.tone] || toneClasses.indigo;
            return (
              <motion.article
                key={feature.id}
                variants={revealItem}
                whileHover={reduceMotion ? undefined : { y: -6 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className={`group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 sm:rounded-[1.5rem] sm:p-7 ${tone.card}`}
              >
                {/* Icon + badge */}
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-xl sm:h-12 sm:w-12 sm:rounded-2xl ${tone.iconBg}`}
                  >
                    <feature.icon sx={{ fontSize: 22 }} />
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold sm:px-4 sm:py-1.5 sm:text-sm ${tone.badge}`}
                  >
                    {feature.eyebrow}
                  </span>
                </div>

                {/* Content */}
                <h3 className="mt-4 text-lg font-bold tracking-tight text-slate-950 sm:mt-5 sm:text-xl">
                  {feature.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-7 text-slate-500 sm:mt-3 sm:text-base">
                  {feature.description}
                </p>

                {/* CTA */}
                <div className="mt-5 sm:mt-6">
                  <ActionLink
                    action={feature.cta}
                    className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200 sm:px-6 sm:py-3 ${tone.button}`}
                  >
                    {feature.cta.label}
                    <ArrowOutwardRoundedIcon sx={{ fontSize: 16 }} />
                  </ActionLink>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
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
