import { motion, useReducedMotion } from "framer-motion";
import { revealContainer, revealItem } from "./animations";

export default function HowItWorks({ steps }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      id="how-it-works"
      aria-label="How it works"
      className="landing-section py-10 sm:py-14 lg:py-20"
      initial={reduceMotion ? false : "hidden"}
      whileInView={reduceMotion ? undefined : "visible"}
      viewport={{ once: true, amount: 0.15 }}
      variants={revealContainer}
    >
      <div className="mx-auto max-w-7xl">
        {/* Section header */}
        <motion.div variants={revealItem} className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-600 sm:text-sm">
            Simple Process
          </p>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:mt-4 sm:text-3xl lg:text-4xl">
            Get started in four easy steps
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500 sm:mt-4 sm:text-base lg:text-lg">
            From sign up to your first offer — TalentX makes the journey seamless.
          </p>
        </motion.div>

        {/* Steps grid */}
        <div className="relative mt-8 sm:mt-10 lg:mt-14">
          {/* Connector line — desktop only */}
          <div className="absolute left-0 right-0 top-[3.25rem] hidden h-0.5 bg-gradient-to-r from-transparent via-indigo-200 to-transparent lg:block" />

          <div className="grid gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-4 lg:gap-6">
            {steps.map((step, index) => (
              <motion.div
                key={step.step}
                variants={revealItem}
                whileHover={reduceMotion ? undefined : { y: -4 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="group relative flex flex-col items-center text-center"
              >
                {/* Step number circle */}
                <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-indigo-200 bg-white text-indigo-700 shadow-sm transition-all duration-300 group-hover:border-indigo-400 group-hover:shadow-md group-hover:shadow-indigo-100 sm:h-16 sm:w-16 sm:rounded-[1.25rem]">
                  <step.icon sx={{ fontSize: 26 }} />
                </div>

                {/* Step label */}
                <span className="mt-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white sm:mt-4">
                  {step.step}
                </span>

                {/* Card body */}
                <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 group-hover:border-indigo-100 group-hover:shadow-md sm:mt-4 sm:p-5">
                  <h3 className="text-base font-bold text-slate-950 sm:text-lg">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500 sm:leading-7">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
