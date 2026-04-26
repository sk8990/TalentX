import { motion, useReducedMotion } from "framer-motion";
import { revealContainer, revealItem } from "./animations";

export default function ProductPreviewSection({ productPreview }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      id="product-preview"
      aria-label="Product preview"
      className="landing-section py-10 sm:py-14 lg:py-20"
      initial={reduceMotion ? false : "hidden"}
      whileInView={reduceMotion ? undefined : "visible"}
      viewport={{ once: true, amount: 0.12 }}
      variants={revealContainer}
    >
      <div className="mx-auto max-w-7xl">
        <motion.div variants={revealItem} className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-600 sm:text-sm">
            PRODUCT PREVIEW
          </p>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:mt-4 sm:text-3xl lg:text-4xl">
            Everything campus hiring needs in one workspace
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-500 sm:mt-4 sm:text-base lg:text-lg">
            From job discovery to onboarding, TalentX keeps students, recruiters, and
            placement teams connected.
          </p>
        </motion.div>

        <div className="mt-8 grid gap-5 sm:mt-10 sm:grid-cols-2 sm:gap-6 lg:mt-14 lg:grid-cols-4 lg:gap-7">
          {productPreview.map((item) => (
            <motion.article
              key={item.title}
              variants={revealItem}
              whileHover={reduceMotion ? undefined : { y: -6 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100/50 sm:rounded-[1.5rem] sm:p-6"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef3ff] text-[#243b95] transition-colors duration-200 group-hover:bg-[#243b95] group-hover:text-white">
                <item.icon sx={{ fontSize: 24 }} />
              </span>
              <h3 className="mt-5 text-lg font-bold tracking-tight text-slate-950">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-500">{item.description}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
