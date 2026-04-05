import { useState } from "react";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

export default function StudentFAQ() {
  const [openFaq, setOpenFaq] = useState(0);

  const faqs = [
    {
      q: "Why am I seeing 'Not Eligible' for some jobs?",
      a: "Eligibility depends on your profile details like branch and CGPA compared to job criteria.",
    },
    {
      q: "How can I improve job matches?",
      a: "Keep your profile updated with correct branch, year, CGPA, and skills so matching is more accurate.",
    },
    {
      q: "Can I apply without uploading a resume?",
      a: "No. Resume upload (PDF) is required before submitting an application.",
    },
    {
      q: "Where can I track interview and assessment updates?",
      a: "Use the Interviews and Assessments sections in the student dashboard for latest updates.",
    },
    {
      q: "How do I contact support if AI response is not enough?",
      a: "Go to Support, click Raise Support Ticket, submit your question and optional screenshot.",
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="rounded-2xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-cyan-600 px-5 py-6 text-white sm:rounded-3xl sm:px-8 sm:py-8">
        <h1 className="text-2xl font-bold sm:text-3xl">FAQ</h1>
        <p className="mt-1 text-xs text-indigo-100 sm:mt-2 sm:text-sm">Common questions and quick answers for students.</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:rounded-3xl sm:p-6 md:p-8">
        <h2 className="inline-flex items-center gap-2 text-2xl font-bold text-slate-900">
          <HelpOutlineIcon sx={{ fontSize: 24 }} />
          Frequently Asked Questions
        </h2>
        <p className="mt-2 text-sm text-slate-500">Everything you need to navigate placements smoothly.</p>

        <div className="mt-5 space-y-3">
          {faqs.map((item, idx) => (
            <div key={item.q} className="rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-700/50 sm:rounded-2xl">
              <button
                onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
                className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold text-slate-800 dark:text-slate-100"
              >
                {item.q}
                <span className={`shrink-0 text-slate-400 transition-transform duration-200 ${openFaq === idx ? "rotate-180" : ""}`}>▾</span>
              </button>
              {openFaq === idx && <p className="px-4 pb-4 text-sm text-slate-600 dark:text-slate-300">{item.a}</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
