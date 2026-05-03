import { Link, useParams } from "react-router-dom";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import TalentXBrand from "../components/TalentXBrand";
import { landingContent } from "./landing/landingContent";

export default function BlogPlaceholder() {
  const { slug } = useParams();
  const post = landingContent.blogPosts.find((item) => item.slug === slug);

  return (
    <main className="min-h-[100dvh] bg-[#f4f6fb] px-4 py-8 dark:bg-slate-950 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900 sm:rounded-[2rem] sm:p-10">
        <Link to="/" className="inline-flex rounded-2xl bg-[#eef3ff] px-4 py-3 text-[#243b95]">
          <TalentXBrand theme="light" size="sm" />
        </Link>

        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.24em] text-indigo-600">
          {post?.category || "TalentX Blog"}
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-slate-100 sm:text-5xl">
          {post?.title || "TalentX resource"}
        </h1>
        <p className="mt-4 text-sm font-semibold text-slate-400">
          {post?.readTime || "Coming soon"}
        </p>
        <p className="mt-6 text-base leading-8 text-slate-500 dark:text-slate-400">
          {post?.description ||
            "This TalentX resource is being prepared and will be available soon."}
        </p>

        <Link
          to="/#blog"
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-all duration-200 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <ArrowBackRoundedIcon sx={{ fontSize: 18 }} />
          Back to Blog
        </Link>
      </section>
    </main>
  );
}
