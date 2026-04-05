import { motion, useReducedMotion } from "framer-motion";
import { TalentXMark } from "../../components/TalentXBrand";
import { revealContainer, revealItem } from "./animations";

export default function TestimonialsSection({ testimonial }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      id="stories"
      aria-label="Testimonials"
      className="landing-section py-10 sm:py-14 lg:py-20"
      initial={reduceMotion ? false : "hidden"}
      whileInView={reduceMotion ? undefined : "visible"}
      viewport={{ once: true, amount: 0.1 }}
      variants={revealContainer}
    >
      <div className="mx-auto max-w-6xl rounded-2xl bg-[#fbfcff] px-4 py-6 sm:rounded-[2rem] sm:px-6 sm:py-8 lg:px-10 lg:py-12">
        {/* Section header */}
        <motion.p
          variants={revealItem}
          className="text-center text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 sm:text-sm"
        >
          {testimonial.eyebrow}
        </motion.p>
        <motion.h2
          variants={revealItem}
          className="mt-3 text-center text-2xl font-black tracking-tight text-slate-950 sm:mt-4 sm:text-3xl lg:text-4xl"
        >
          A landing page that leads naturally into the right workspace
        </motion.h2>

        {/* Badges */}
        <motion.div
          variants={revealItem}
          className="mt-5 flex flex-wrap justify-center gap-2 sm:mt-8 sm:gap-3"
        >
          {testimonial.badges.map((badge) => (
            <span
              key={badge}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 sm:px-4 sm:py-2 sm:text-sm"
            >
              {badge}
            </span>
          ))}
        </motion.div>

        {/* Quote + story cards */}
        <motion.div
          variants={revealItem}
          className="mt-6 grid gap-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:mt-10 sm:rounded-[2rem] sm:p-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:p-8"
        >
          {/* Left — Quote */}
          <div className="flex flex-col justify-between gap-4 sm:gap-6">
            <div>
              <span className="text-5xl font-black leading-none text-amber-400 sm:text-7xl">"</span>
              <p className="mt-2 text-xl font-medium leading-[1.4] tracking-tight text-slate-500 sm:mt-4 sm:text-2xl sm:leading-[1.35] lg:text-3xl">
                {testimonial.quote}
              </p>
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 sm:h-16 sm:w-16">
                <TalentXMark size="sm" />
              </span>
              <div>
                <p className="text-base font-bold text-slate-950 sm:text-lg">{testimonial.name}</p>
                <p className="text-xs leading-5 text-slate-500 sm:text-sm sm:leading-6">
                  {testimonial.role}
                </p>
              </div>
            </div>
          </div>

          {/* Right — Story cards */}
          <div className="grid gap-3 sm:gap-4">
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
  );
}

function StoryCard({ title, text, reduceMotion }) {
  return (
    <motion.article
      whileHover={reduceMotion ? undefined : { y: -4 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition-shadow hover:shadow-md sm:rounded-[1.5rem] sm:p-5"
    >
      <h3 className="text-base font-bold text-slate-950 sm:text-lg">{title}</h3>
      <p className="mt-1.5 text-sm leading-6 text-slate-500 sm:mt-2 sm:leading-7">{text}</p>
    </motion.article>
  );
}
