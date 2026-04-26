import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import { revealContainer, revealItem } from "./animations";

export default function BlogSection({ blogPosts }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      id="blog"
      aria-label="TalentX resources"
      className="landing-section py-10 sm:py-14 lg:py-20"
      initial={reduceMotion ? false : "hidden"}
      whileInView={reduceMotion ? undefined : "visible"}
      viewport={{ once: true, amount: 0.08 }}
      variants={revealContainer}
    >
      <div className="mx-auto max-w-7xl">
        <motion.div variants={revealItem} className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-600 sm:text-sm">
            RESOURCES
          </p>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:mt-4 sm:text-3xl lg:text-4xl">
            Insights for smarter campus hiring
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-500 sm:mt-4 sm:text-base lg:text-lg">
            Explore guides for students, recruiters, and placement teams.
          </p>
        </motion.div>

        <div className="mt-8 grid gap-5 sm:mt-10 md:grid-cols-2 lg:mt-14 lg:grid-cols-3">
          {blogPosts.map((post) => (
            <motion.article
              key={post.slug}
              variants={revealItem}
              whileHover={reduceMotion ? undefined : { y: -6 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="flex min-h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100/50 sm:rounded-[1.5rem] sm:p-6"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                  {post.category}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                  <ScheduleRoundedIcon sx={{ fontSize: 15 }} />
                  {post.readTime}
                </span>
              </div>

              <h3 className="mt-5 text-lg font-black tracking-tight text-slate-950 sm:text-xl">
                {post.title}
              </h3>
              <p className="mt-3 flex-1 text-sm leading-7 text-slate-500">{post.description}</p>

              <Link
                to={`/blog/${post.slug}`}
                className="mt-6 inline-flex w-fit items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-all duration-200 hover:border-[#243b95] hover:bg-[#eef3ff] hover:text-[#243b95]"
              >
                Read More
                <ArrowOutwardRoundedIcon sx={{ fontSize: 16 }} />
              </Link>
            </motion.article>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
