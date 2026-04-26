import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import { revealContainer, revealItem } from "./animations";

export default function FAQSection({ faqs }) {
  const reduceMotion = useReducedMotion();
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <motion.section
      id="faq"
      aria-label="Frequently asked questions"
      className="landing-section py-10 sm:py-14 lg:py-20"
      initial={reduceMotion ? false : "hidden"}
      whileInView={reduceMotion ? undefined : "visible"}
      viewport={{ once: true, amount: 0.08 }}
      variants={revealContainer}
    >
      <div className="mx-auto max-w-5xl">
        <motion.div variants={revealItem} className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-600 sm:text-sm">
            FAQ
          </p>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:mt-4 sm:text-3xl lg:text-4xl">
            Questions teams ask before starting
          </h2>
        </motion.div>

        <motion.div variants={revealItem} className="mt-8 space-y-3 sm:mt-10">
          {faqs.map((item, index) => {
            const isOpen = openIndex === index;

            return (
              <article
                key={item.question}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 sm:rounded-[1.35rem]"
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left sm:px-6 sm:py-5"
                  onClick={() => setOpenIndex(isOpen ? -1 : index)}
                  aria-expanded={isOpen}
                >
                  <span className="text-sm font-bold text-slate-950 sm:text-base">
                    {item.question}
                  </span>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eef3ff] text-[#243b95]">
                    {isOpen ? (
                      <RemoveRoundedIcon sx={{ fontSize: 20 }} />
                    ) : (
                      <AddRoundedIcon sx={{ fontSize: 20 }} />
                    )}
                  </span>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 text-sm leading-7 text-slate-500 sm:px-6 sm:pb-5 sm:text-base sm:leading-8">
                    {item.answer}
                  </div>
                )}
              </article>
            );
          })}
        </motion.div>
      </div>
    </motion.section>
  );
}
