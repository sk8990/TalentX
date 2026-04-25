import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import BusinessCenterRoundedIcon from "@mui/icons-material/BusinessCenterRounded";
import AttachMoneyRoundedIcon from "@mui/icons-material/AttachMoneyRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import PlayCircleOutlineRoundedIcon from "@mui/icons-material/PlayCircleOutlineRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import MapOutlinedIcon from "@mui/icons-material/MapOutlined";
import QrCode2RoundedIcon from "@mui/icons-material/QrCode2Rounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import onboardingAPI, { buildServerAssetUrl } from "./api";
import {
  clearStoredOnboardingInstanceId,
  clearStoredOnboardingToken,
  decodeJwtPayload,
  getStoredOnboardingInstanceId,
  getStoredOnboardingToken,
  persistOnboardingInstanceId,
  persistOnboardingToken
} from "./session";
import { readStoredSession } from "../utils/authRouting";
import { readStepFormValues, buildPortalSearch } from "./constants";
import StatusBanner from "./StatusBanner";
import SelectorScreen from "./SelectorScreen";
import FallbackScreen from "./FallbackScreen";
import UploadCard from "./UploadCard";
import PortalSkeleton from "./PortalSkeleton";
import TopHeader from "./TopHeader";
import StepperSidebar from "./StepperSidebar";
import DashboardCards from "./DashboardCards";
import LearnMoreSectionView from "./LearnMoreSectionView";
import StepContentRenderer from "./StepContentRenderer";
import OnboardingLayout from "./OnboardingLayout";
import AcceptOfferWizard from "./AcceptOfferWizard";

function buildLocalPreJoiningReading({ task, companyName, jobTitle }) {
  const companyLabel = String(companyName || "the company").trim() || "the company";
  const roleLabel = String(jobTitle || "your role").trim() || "your role";

  const sectionMap = {
    companyPolicies: [
      {
        heading: "Workplace Policies",
        body: `${companyLabel} will usually guide new hires through attendance expectations, leave planning, communication norms, and handbook-based operating rules relevant to ${roleLabel}.`
      },
      {
        heading: "Benefits And Support",
        body: "Expect HR to share official details for benefits, help channels, and internal resources during onboarding. Use recruiter guidance as the final source of truth for eligibility and timelines."
      },
      {
        heading: "What To Do Next",
        body: "Read the official handbook carefully, note any questions, and confirm company-specific exceptions directly with HR before day one."
      }
    ],
    codeOfConduct: [
      {
        heading: "Professional Conduct",
        body: `${companyLabel} will expect respectful communication, accountability, collaboration, and ethical behavior in meetings, messages, and all workplace interactions.`
      },
      {
        heading: "Integrity Standards",
        body: "Avoid harassment, discrimination, misuse of company systems, or conflicts of interest. When a situation feels unclear, escalate through the appropriate manager or HR channel."
      },
      {
        heading: "How To Stay Aligned",
        body: "Use the company handbook and your recruiter’s onboarding pack to understand the reporting path for behavior concerns and policy questions."
      }
    ],
    dataPrivacy: [
      {
        heading: "Protecting Sensitive Data",
        body: `As a new hire in ${roleLabel}, you may see internal systems or sensitive records. Access only what you need and use approved company tools for storing or sharing information.`
      },
      {
        heading: "Security Habits",
        body: "Expect requirements like strong passwords, MFA, device security, and phishing awareness. Report suspicious requests or unusual account activity immediately."
      },
      {
        heading: "Confidentiality",
        body: "Treat internal documents, customer information, and employee data as confidential unless HR or your manager has clearly approved otherwise."
      }
    ],
    trainingOverview: [
      {
        heading: "Your Early Training Plan",
        body: `${companyLabel} will usually onboard new campus hires through orientation materials, system setup, team introductions, and role-specific ramp-up sessions for ${roleLabel}.`
      },
      {
        heading: "Priority Modules",
        body: "Complete required reading, tool setup, compliance tasks, and any mandatory training items first so your access and first-week schedule stay on track."
      },
      {
        heading: "Video Fallback",
        body: "If a company-specific welcome video is unavailable, continue with the written onboarding tasks and recruiter instructions. The written content is enough to complete this step."
      }
    ]
  };

  return {
    title: `${task?.title || "Pre-Joining Reading"} at ${companyLabel}`,
    intro: `This is a company-aware fallback brief for a new hire joining ${companyLabel} as ${roleLabel}. Review it, then confirm the official details in HR communications and signed documents.`,
    estimatedReadMinutes: 4,
    sections: sectionMap[task?.key] || [
      {
        heading: "Overview",
        body: `${task?.title || "This reading"} helps you prepare for onboarding expectations at ${companyLabel}.`
      },
      {
        heading: "How To Use It",
        body: "Treat this as a preparation summary and rely on the official HR pack for final policy wording."
      }
    ],
    keyTakeaways: [
      `Understand how ${companyLabel} expects new hires to work and communicate.`,
      "Use official company documents as the final source of truth.",
      "Raise policy or compliance questions with HR before day one."
    ],
    acknowledgement: "I have reviewed this preparation brief and I understand that official HR and company policy documents take precedence."
  };
}

function buildLocalVideoFallback(companyName) {
  const companyLabel = String(companyName || "Company").trim() || "Company";
  const searchQuery = `${companyLabel} campus tour`;

  return {
    title: `${companyLabel} Welcome Video`,
    description: `A company-specific public welcome or campus tour video is not available right now. You can still complete onboarding using the written materials below.`,
    embedUrl: "",
    sourceUrl: "",
    searchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`,
    provider: "none",
    isFallback: true
  };
}

function OfferStepView({ step, onSubmit, isSubmitting }) {
  const [acceptedTerms, setAcceptedTerms] = useState(step.status === "completed" || step.status === "approved");

  useEffect(() => {
    setAcceptedTerms(step.status === "completed" || step.status === "approved");
  }, [step.id, step.status]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[30px] font-semibold tracking-tight text-slate-950">{step.title}</h2>
        <p className="mt-2 text-sm text-slate-500">{step.description}</p>
      </div>

      <StatusBanner banner={step.statusBanner} />

      <div className="grid gap-4 md:grid-cols-2">
        {step.content.cards.map((card) => {
          const icon =
            card.key === "salary" ? <AttachMoneyRoundedIcon sx={{ fontSize: 18 }} /> :
              card.key === "location" ? <PlaceRoundedIcon sx={{ fontSize: 18 }} /> :
                card.key === "joiningDate" ? <CalendarMonthRoundedIcon sx={{ fontSize: 18 }} /> :
                  <BusinessCenterRoundedIcon sx={{ fontSize: 18 }} />;

          return (
            <div key={card.key} className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
              <div className="flex items-center gap-4">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  {icon}
                </span>
                <div>
                  <p className="text-xs font-medium text-slate-400">{card.label}</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{card.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
            <DescriptionRoundedIcon sx={{ fontSize: 18 }} />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Offer Letter</h3>
            <p className="text-sm text-slate-500">Review every term before continuing.</p>
          </div>
        </div>

        <div className="mt-5 rounded-[20px] border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-600">
          {step.content.offerLetterParagraphs.map((paragraph, idx) => (
            <p key={`${idx}-${paragraph.slice(0, 12)}`} className="mb-3 whitespace-pre-line last:mb-0">
              {paragraph}
            </p>
          ))}
        </div>

        {step.content.offerLetterUrl && (
          <a
            href={buildServerAssetUrl(step.content.offerLetterUrl)}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Open generated offer PDF
            <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />
          </a>
        )}
      </div>

      <div className="rounded-[22px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <label className="flex items-start gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={acceptedTerms}
            disabled={step.status === "completed" || step.status === "approved"}
            onChange={(event) => setAcceptedTerms(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span>{step.content.acceptanceLabel}</span>
        </label>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => onSubmit({ acceptedTerms })}
          disabled={!acceptedTerms || isSubmitting || step.status === "completed" || step.status === "approved"}
          className="rounded-[18px] bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {step.status === "completed" || step.status === "approved"
            ? "Offer Accepted"
            : isSubmitting
              ? "Accepting..."
              : "Accept Offer"}
        </button>
      </div>
    </div>
  );
}



function DocumentStepView({ step, instanceId, authToken, onSubmitStep, isSubmitting }) {
  const [formState, setFormState] = useState(readStepFormValues(step));
  const [documentState, setDocumentState] = useState(() => (
    Object.fromEntries((step.content.requiredDocuments || []).map((item) => [item.key, item.document || null]))
  ));

  useEffect(() => {
    setFormState(readStepFormValues(step));
    setDocumentState(Object.fromEntries((step.content.requiredDocuments || []).map((item) => [item.key, item.document || null])));
  }, [step.id, step.submission?.version, step.status]);

  const readOnly = step.status === "under_review" || step.status === "approved";



  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[30px] font-semibold tracking-tight text-slate-950">{step.title}</h2>
        <p className="mt-2 text-sm text-slate-500">{step.description}</p>
      </div>

      <StatusBanner banner={step.statusBanner} />

      {(step.content.sections || []).map((section) => (
        <section key={section.key} className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-900">{section.title}</h3>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {section.fields.map((field) => (
              <label key={field.key} className={field.key === "streetAddress" ? "md:col-span-2" : ""}>
                <span className="mb-2 block text-sm font-semibold text-slate-700">{field.label}</span>
                <input
                  type={field.type || "text"}
                  value={formState[field.key] || ""}
                  readOnly={readOnly}
                  onChange={(event) => setFormState((current) => ({ ...current, [field.key]: event.target.value }))}
                  placeholder={field.placeholder || ""}
                  className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:bg-white read-only:cursor-not-allowed read-only:opacity-80"
                />
              </label>
            ))}
          </div>
        </section>
      ))}

      <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-xl font-semibold text-slate-900">Upload Documents</h3>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {step.content.requiredDocuments.map((item) => (
            <UploadCard
              key={item.key}
              doc={{ ...item, document: documentState[item.key] }}
              instanceId={instanceId}
              stepId={step.id}
              authToken={authToken}
              disabled={readOnly}
              onUploaded={(key, document) => {
                setDocumentState((prev) => ({ ...prev, [key]: document }));
                toast.success(`${item.label} uploaded`);
              }}
            />
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => onSubmitStep({ formData: formState })}
          disabled={readOnly || isSubmitting}
          className="rounded-[18px] bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {step.status === "approved"
            ? "Documents Approved"
            : step.status === "under_review"
              ? "Awaiting Review"
              : isSubmitting
                ? "Submitting..."
                : step.status === "rejected"
                  ? "Resubmit Documents"
                  : "Submit Documents"}
        </button>
      </div>
    </div>
  );
}

function ReadingModal({ open, task, reading, loading, readOnly, onClose, onMarkRead }) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-8 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.24)] sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
              <AutoAwesomeRoundedIcon sx={{ fontSize: 15 }} />
              AI-tailored Company Reading
            </p>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">{reading?.title || task?.title || "Reading"}</h3>
            <p className="mt-2 text-sm text-slate-500">
              {reading?.estimatedReadMinutes ? `${reading.estimatedReadMinutes} min read` : "Preparing reading material..."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        {loading ? (
          <div className="mt-6 rounded-[22px] border border-slate-200 bg-slate-50 px-5 py-12 text-center text-sm text-slate-500">
            Generating company-specific reading content...
          </div>
        ) : reading ? (
          <>
            <div className="mt-6 rounded-[22px] border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-7 text-slate-600">
              {reading.intro}
            </div>

            <div className="mt-6 space-y-4">
              {(reading.sections || []).map((section) => (
                <section key={section.heading} className="rounded-[22px] border border-slate-200 bg-white p-5">
                  <h4 className="text-lg font-semibold text-slate-900">{section.heading}</h4>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{section.body}</p>
                </section>
              ))}
            </div>

            {reading.keyTakeaways?.length > 0 && (
              <section className="mt-6 rounded-[22px] border border-emerald-200 bg-emerald-50/70 p-5">
                <h4 className="text-lg font-semibold text-slate-900">Key Takeaways</h4>
                <ul className="mt-4 space-y-3 text-sm text-slate-700">
                  {reading.keyTakeaways.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {reading.acknowledgement && (
              <div className="mt-6 rounded-[22px] border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
                {reading.acknowledgement}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-[18px] border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>
              {!readOnly && (
                <button
                  type="button"
                  onClick={onMarkRead}
                  className="rounded-[18px] bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  Mark As Read
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="mt-6 rounded-[22px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            We could not load this reading right now. Please try again.
          </div>
        )}
      </div>
    </div>
  );
}

function PreJoiningStepView({
  step,
  instanceId,
  authToken,
  companyName,
  jobTitle,
  initialFocusTaskKey,
  onSubmit,
  isSubmitting
}) {
  const [taskState, setTaskState] = useState(() => Object.fromEntries((step.content.tasks || []).map((task) => [task.key, task.completed])));
  const [acceptedPolicies, setAcceptedPolicies] = useState(Boolean(step.content.acceptedPolicies));
  const [readingCache, setReadingCache] = useState({});
  const [activeTaskKey, setActiveTaskKey] = useState("");
  const [loadingTaskKey, setLoadingTaskKey] = useState("");
  const [videoAsset, setVideoAsset] = useState(step.content.video || buildLocalVideoFallback(companyName));
  const [videoLoading, setVideoLoading] = useState(false);

  useEffect(() => {
    setTaskState(Object.fromEntries((step.content.tasks || []).map((task) => [task.key, task.completed])));
    setAcceptedPolicies(Boolean(step.content.acceptedPolicies));
    setReadingCache({});
    setActiveTaskKey("");
    setLoadingTaskKey("");
    setVideoAsset(step.content.video || buildLocalVideoFallback(companyName));
  }, [step.id, step.submission?.version, step.status, companyName]);

  const completedCount = Object.values(taskState).filter(Boolean).length;
  const readOnly = step.status === "completed" || step.status === "approved";

  useEffect(() => {
    let cancelled = false;

    async function loadCompanyVideo() {
      if (!instanceId || !authToken) {
        setVideoAsset(step.content.video || buildLocalVideoFallback(companyName));
        return;
      }

      setVideoLoading(true);
      try {
        const response = await onboardingAPI.get(`/onboarding/pre-joining/${instanceId}/video`, {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        });

        if (!cancelled) {
          setVideoAsset(response.data?.video || null);
        }
      } catch (_err) {
        if (!cancelled) {
          setVideoAsset(step.content.video || buildLocalVideoFallback(companyName));
        }
      } finally {
        if (!cancelled) {
          setVideoLoading(false);
        }
      }
    }

    loadCompanyVideo();

    return () => {
      cancelled = true;
    };
  }, [step.id, step.content.video, instanceId, authToken, companyName]);

  const openReading = async (task) => {
    if (!task?.key) {
      return;
    }

    setActiveTaskKey(task.key);

    if (readingCache[task.key]) {
      return;
    }

    const fallbackReading = buildLocalPreJoiningReading({
      task,
      companyName,
      jobTitle
    });

    if (!instanceId || !authToken) {
      setReadingCache((current) => ({
        ...current,
        [task.key]: fallbackReading
      }));
      return;
    }

    setLoadingTaskKey(task.key);
    try {
      const response = await onboardingAPI.get(`/onboarding/pre-joining/${instanceId}/content/${encodeURIComponent(task.key)}`, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });

      setReadingCache((current) => ({
        ...current,
        [task.key]: response.data?.reading || fallbackReading
      }));
    } catch (_err) {
      setReadingCache((current) => ({
        ...current,
        [task.key]: fallbackReading
      }));
      toast("Showing fallback reading content for now.");
    } finally {
      setLoadingTaskKey("");
    }
  };

  useEffect(() => {
    if (!initialFocusTaskKey) {
      return;
    }

    const focusTask = (step.content.tasks || []).find((task) => task.key === initialFocusTaskKey);
    if (!focusTask) {
      return;
    }

    openReading(focusTask);
  }, [initialFocusTaskKey, step.id]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[30px] font-semibold tracking-tight text-slate-950">{step.title}</h2>
        <p className="mt-2 text-sm text-slate-500">{step.description}</p>
      </div>

      <StatusBanner banner={step.statusBanner} />

      <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-xl font-semibold text-slate-900">Required Reading & Acknowledgements</h3>
        <p className="mt-2 text-sm text-slate-500">{step.content.aiNotice}</p>
        <div className="mt-5 space-y-4">
          {step.content.tasks.map((task) => (
            <button
              key={task.key}
              type="button"
              onClick={() => openReading(task)}
              className="group flex w-full items-start justify-between gap-4 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:border-indigo-300 hover:bg-indigo-50/60"
            >
              <div className="flex items-start gap-4">
                <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                  taskState[task.key] ? "bg-emerald-100 text-emerald-600" : "bg-white text-indigo-600"
                }`}>
                  {taskState[task.key] ? <CheckCircleRoundedIcon sx={{ fontSize: 22 }} /> : <DescriptionRoundedIcon sx={{ fontSize: 20 }} />}
                </span>

                <span>
                  <span className="block text-lg font-semibold text-slate-900">{task.title}</span>
                  <span className="mt-1 block text-sm text-slate-500">{task.description}</span>
                  <span className="mt-3 inline-flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-600">
                      {taskState[task.key] ? "Read" : "Unread"}
                    </span>
                    {task.generatedContentMeta && (
                      <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 font-semibold text-indigo-600">
                        {task.generatedContentMeta.estimatedReadMinutes} min AI brief ready
                      </span>
                    )}
                  </span>
                </span>
              </div>

              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition group-hover:border-indigo-200 group-hover:text-indigo-600">
                {taskState[task.key] ? "Read Again" : "Read Now"}
                <ArrowForwardRoundedIcon sx={{ fontSize: 14 }} />
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-[26px] border border-indigo-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white">
            <PlayCircleOutlineRoundedIcon sx={{ fontSize: 26 }} />
          </span>
          <div>
            <h3 className="text-xl font-semibold text-slate-900">{videoAsset?.title || "Company Welcome Video"}</h3>
            <p className="mt-1 text-sm text-slate-500">{videoAsset?.description || "We are sourcing a company-specific onboarding or campus tour video."}</p>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-[22px] border border-slate-200 bg-slate-950">
          {videoLoading ? (
            <div className="grid aspect-video place-items-center text-sm text-slate-300">Finding a company-specific video...</div>
          ) : videoAsset?.embedUrl ? (
            <iframe
              title={videoAsset?.title || "Welcome video"}
              src={videoAsset.embedUrl}
              className="aspect-video w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="grid aspect-video place-items-center px-6 text-center text-slate-300">
              <div>
                <p className="text-base font-semibold">No company video found yet</p>
                <p className="mt-2 text-sm text-slate-400">
                  We could not confidently match a public welcome or campus tour video for this employer.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {videoAsset?.sourceUrl && (
            <a
              href={videoAsset.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Open discovered source
              <OpenInNewRoundedIcon sx={{ fontSize: 16 }} />
            </a>
          )}

          {!videoAsset?.embedUrl && videoAsset?.searchUrl && (
            <a
              href={videoAsset.searchUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Search public company videos
              <OpenInNewRoundedIcon sx={{ fontSize: 16 }} />
            </a>
          )}
        </div>
      </section>

      <div className="rounded-[22px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <label className="flex items-start gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={acceptedPolicies}
            disabled={readOnly}
            onChange={(event) => setAcceptedPolicies(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span>I confirm that I have reviewed the required policies and I am ready to proceed.</span>
        </label>
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-slate-500">{completedCount} of {step.content.tasks.length} tasks completed</p>
        <button
          type="button"
          onClick={() => onSubmit({ tasks: taskState, acceptedPolicies })}
          disabled={readOnly || completedCount !== step.content.tasks.length || !acceptedPolicies || isSubmitting}
          className="rounded-[18px] bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {readOnly ? "Pre-Joining Complete" : isSubmitting ? "Completing..." : "Complete Pre-Joining"}
        </button>
      </div>

      <ReadingModal
        open={Boolean(activeTaskKey)}
        task={step.content.tasks.find((task) => task.key === activeTaskKey) || null}
        reading={activeTaskKey ? readingCache[activeTaskKey] : null}
        loading={Boolean(activeTaskKey) && loadingTaskKey === activeTaskKey}
        readOnly={readOnly}
        onClose={() => setActiveTaskKey("")}
        onMarkRead={() => {
          if (activeTaskKey) {
            setTaskState((current) => ({ ...current, [activeTaskKey]: true }));
          }
          setActiveTaskKey("");
        }}
      />
    </div>
  );
}

function buildJoiningPassSvg(instance, step) {
  const qrHref = step.content.qrCodeSvg;
  const companyName = instance.companyName;
  const jobTitle = instance.job.title;
  const dateLabel = step.content.joiningDate;
  const passCode = step.content.passCode;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="820" height="520" viewBox="0 0 820 520">
      <defs>
        <linearGradient id="panel" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="100%" stop-color="#f5f7ff" />
        </linearGradient>
      </defs>
      <rect width="820" height="520" rx="34" fill="#eef2ff" />
      <rect x="24" y="24" width="772" height="472" rx="28" fill="url(#panel)" stroke="#dbe4ff" />
      <text x="56" y="88" font-size="20" font-family="Arial, sans-serif" fill="#6366f1" font-weight="700">TalentX Onboarding Portal</text>
      <text x="56" y="136" font-size="38" font-family="Arial, sans-serif" fill="#0f172a" font-weight="700">${companyName}</text>
      <text x="56" y="180" font-size="22" font-family="Arial, sans-serif" fill="#475569">${jobTitle}</text>
      <text x="56" y="240" font-size="16" font-family="Arial, sans-serif" fill="#64748b">Joining Date</text>
      <text x="56" y="272" font-size="28" font-family="Arial, sans-serif" fill="#0f172a" font-weight="600">${dateLabel}</text>
      <text x="56" y="336" font-size="16" font-family="Arial, sans-serif" fill="#64748b">Pass Code</text>
      <text x="56" y="370" font-size="26" font-family="Arial, sans-serif" fill="#0f172a" font-weight="700">${passCode}</text>
      <rect x="520" y="118" width="218" height="218" rx="22" fill="#ffffff" stroke="#c7d2fe" />
      <image href="${qrHref}" x="549" y="147" width="160" height="160" />
      <text x="629" y="382" text-anchor="middle" font-size="16" font-family="Arial, sans-serif" fill="#64748b">Show this code at reception</text>
    </svg>
  `;
}

function downloadJoiningPass(instance, step) {
  const svgMarkup = buildJoiningPassSvg(instance, step);
  const blob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${instance.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-joining-pass.svg`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function DayOneStepView({ instance, step }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[30px] font-semibold tracking-tight text-slate-950">{step.title}</h2>
        <p className="mt-2 text-sm text-slate-500">{step.description}</p>
      </div>

      <StatusBanner banner={step.statusBanner || instance.overallBanner} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
          <div className="flex items-center gap-4">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <CalendarMonthRoundedIcon sx={{ fontSize: 20 }} />
            </span>
            <div>
              <p className="text-xs font-medium text-slate-400">Joining Date</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{step.content.joiningDate}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
          <div className="flex items-center gap-4">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-fuchsia-50 text-fuchsia-600">
              <ScheduleRoundedIcon sx={{ fontSize: 20 }} />
            </span>
            <div>
              <p className="text-xs font-medium text-slate-400">Reporting Time</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{step.content.reportingTime}</p>
            </div>
          </div>
        </div>
      </div>

      <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <MapOutlinedIcon sx={{ fontSize: 20 }} />
          </span>
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Office Location</h3>
            <p className="mt-1 text-sm text-slate-500">{step.content.location?.name}</p>
            {(step.content.location?.addressLines || []).map((line) => (
              <p key={line} className="text-sm text-slate-700">{line}</p>
            ))}
          </div>
        </div>

        <div className="mt-5 flex min-h-55 items-center justify-center rounded-[22px] border border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] text-slate-500">
          <div className="text-center">
            <MapOutlinedIcon sx={{ fontSize: 34 }} />
            <p className="mt-3 text-sm font-medium">{step.content.location?.mapLabel}</p>
          </div>
        </div>
      </section>

      <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <VerifiedRoundedIcon sx={{ fontSize: 20 }} />
          </span>
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Reporting Instructions</h3>
            <p className="mt-1 text-sm text-slate-500">Everything you need before walking in on day one.</p>
          </div>
        </div>

        <ul className="mt-5 space-y-3 text-sm text-slate-700">
          {step.content.instructions.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-indigo-500" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_1fr]">
        <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-center">
            <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <QrCode2RoundedIcon sx={{ fontSize: 22 }} />
            </span>
            <h3 className="mt-4 text-xl font-semibold text-slate-900">{step.content.passLabel}</h3>
          </div>

          <div className="mx-auto mt-5 flex w-fit flex-col items-center rounded-3xl border border-slate-200 bg-slate-50 px-8 py-8">
            <img src={step.content.qrCodeSvg} alt={step.content.passCode} className="h-40 w-40 rounded-2xl" />
            <p className="mt-4 text-sm font-semibold text-slate-900">{step.content.passCode}</p>
            <p className="mt-2 text-xs text-slate-500">Show this QR code at reception</p>
          </div>
        </section>

        <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-center">
            <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <ApartmentRoundedIcon sx={{ fontSize: 22 }} />
            </span>
            <h3 className="mt-4 text-xl font-semibold text-slate-900">Day 1 Agenda</h3>
          </div>

          <div className="mt-5 space-y-3">
            {step.content.agenda.map((item) => (
              <div key={`${item.time}-${item.title}`} className="flex items-center justify-between gap-4 rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="text-sm font-semibold text-slate-900">{item.time}</span>
                <span className="text-sm text-slate-600">{item.title}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => downloadJoiningPass(instance, step)}
          className="inline-flex items-center gap-2 rounded-[18px] bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          <DownloadRoundedIcon sx={{ fontSize: 18 }} />
          Download Joining Pass
        </button>
      </div>
    </div>
  );
}

export default function OnboardingPortal() {
  const navigate = useNavigate();
  const location = useLocation();
  const [portalData, setPortalData] = useState(null);
  const [viewMode, setViewMode] = useState("dashboard");
  const [selectedStepId, setSelectedStepId] = useState("");
  const [stepFocusKey, setStepFocusKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [submittingStepId, setSubmittingStepId] = useState("");
  const [blockedToken, setBlockedToken] = useState(null);
  const [onboardingToken, setOnboardingToken] = useState(() => getStoredOnboardingToken());
  const [fetchError, setFetchError] = useState("");
  const [learnMoreSectionKey, setLearnMoreSectionKey] = useState("");
  const [learnMorePayload, setLearnMorePayload] = useState(null);
  const [learnMoreLoading, setLearnMoreLoading] = useState(false);
  const [learnMoreCache, setLearnMoreCache] = useState({});

  const storedSession = readStoredSession();
  const hasMainStudentSession = Boolean(storedSession.token && storedSession.user?.role === "student");

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const queryToken = searchParams.get("token");
    const queryInstanceId = searchParams.get("instanceId");

    if (!queryToken) {
      return;
    }

    persistOnboardingToken(queryToken);
    setOnboardingToken(queryToken);

    if (queryInstanceId) {
      persistOnboardingInstanceId(queryInstanceId);
    }

    navigate(
      {
        pathname: "/onboarding",
        search: buildPortalSearch(queryInstanceId),
      },
      { replace: true }
    );
  }, [location.search, navigate]);

  useEffect(() => {
    if (blockedToken) {
      setLoading(false);
      return;
    }

    const searchParams = new URLSearchParams(location.search);
    const instanceId = searchParams.get("instanceId") || getStoredOnboardingInstanceId();
    const activeToken = onboardingToken || (hasMainStudentSession ? storedSession.token : "");

    if (!activeToken) {
      setPortalData(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchPortal() {
      setLoading(true);
      setFetchError("");

      try {
        const response = await onboardingAPI.get("/onboarding", {
          params: instanceId ? { instanceId } : {},
          headers: {
            Authorization: `Bearer ${activeToken}`,
          },
        });

        if (cancelled) {
          return;
        }

        const payload = response.data;
        setPortalData(payload);

        if (payload?.mode === "portal" && payload.selectedInstance?.id) {
          persistOnboardingInstanceId(payload.selectedInstance.id);

          setSelectedStepId((current) => {
            const steps = payload.selectedInstance.steps || [];
            if (current && steps.some((step) => step.id === current && !step.isLocked)) {
              return current;
            }
            return payload.selectedInstance.currentStepId || steps[0]?.id || "";
          });
        } else {
          setSelectedStepId("");
        }
      } catch (err) {
        if (cancelled) {
          return;
        }

        if (err.response?.status === 401 && onboardingToken) {
          clearStoredOnboardingToken();
          setOnboardingToken("");
          setBlockedToken({
            decoded: decodeJwtPayload(onboardingToken),
            hasMainStudentSession,
          });
        } else {
          setPortalData(null);
          setFetchError(err.response?.data?.message || "Failed to load onboarding portal");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchPortal();

    return () => {
      cancelled = true;
    };
  }, [location.search, onboardingToken, blockedToken, hasMainStudentSession, storedSession.token]);

  const selectedInstance = portalData?.selectedInstance || null;
  const activeStep = useMemo(() => {
    if (!selectedInstance?.steps?.length) {
      return null;
    }

    return selectedInstance.steps.find((step) => step.id === selectedStepId) || selectedInstance.currentStep || selectedInstance.steps[0];
  }, [selectedInstance, selectedStepId]);

  const activeAuthToken = onboardingToken || (hasMainStudentSession ? storedSession.token : "");

  useEffect(() => {
    if (!selectedInstance?.id) {
      return;
    }

    setViewMode("dashboard");
    setStepFocusKey("");
    setLearnMoreSectionKey("");
    setLearnMorePayload(null);
    setLearnMoreLoading(false);
  }, [selectedInstance?.id]);

  const openStepView = (stepId, focusTaskKey = "") => {
    setSelectedStepId(stepId);
    setStepFocusKey(focusTaskKey);
    setViewMode("step");
  };

  const handleSelectCompany = (instanceId) => {
    persistOnboardingInstanceId(instanceId);
    setViewMode("dashboard");
    setStepFocusKey("");
    setLearnMoreSectionKey("");
    setLearnMorePayload(null);
    setLearnMoreLoading(false);
    navigate({
      pathname: "/onboarding",
      search: buildPortalSearch(instanceId),
    });
  };

  const handleWizardCancel = () => {
    clearStoredOnboardingInstanceId();
    setLoading(true);
    setPortalData(null);
    setSelectedStepId("");
    setViewMode("dashboard");
    navigate({
      pathname: "/onboarding",
      search: "",
    });
  };

  const handleWizardAccepted = (payload) => {
    if (payload) {
      setPortalData(payload);
      if (payload?.mode === "portal" && payload.selectedInstance?.id) {
        persistOnboardingInstanceId(payload.selectedInstance.id);
        setSelectedStepId(payload.selectedInstance.currentStepId || payload.selectedInstance.steps?.[0]?.id || "");
        navigate({
          pathname: "/onboarding",
          search: buildPortalSearch(payload.selectedInstance.id),
        }, { replace: true });
      }
    }

    setViewMode("dashboard");
    setStepFocusKey("");
    setLearnMoreSectionKey("");
    setLearnMorePayload(null);
    setLearnMoreLoading(false);
  };

  const handleContinueWithSession = () => {
    setBlockedToken(null);
    navigate({
      pathname: "/onboarding",
      search: buildPortalSearch(getStoredOnboardingInstanceId()),
    });
  };

  const handleBackToDashboard = () => {
    setViewMode("dashboard");
    setStepFocusKey("");
  };

  const handleOpenCard = async (card) => {
    if (!selectedInstance?.id || !card?.key) {
      return;
    }

    const sectionKey = card.key;
    const cacheKey = `${selectedInstance.id}:${sectionKey}`;

    setLearnMoreSectionKey(sectionKey);
    setViewMode("learn-more");

    if (learnMoreCache[cacheKey]) {
      setLearnMorePayload(learnMoreCache[cacheKey]);
      setLearnMoreLoading(false);
      return;
    }

    setLearnMorePayload(null);
    setLearnMoreLoading(true);

    try {
      const response = await onboardingAPI.get(`/onboarding/learn-more/${selectedInstance.id}/${encodeURIComponent(sectionKey)}`, {
        headers: {
          Authorization: `Bearer ${activeAuthToken}`
        }
      });

      setLearnMorePayload(response.data);
      setLearnMoreCache((current) => ({
        ...current,
        [cacheKey]: response.data
      }));
    } catch (err) {
      setLearnMorePayload(null);
      toast.error(err.response?.data?.message || "Unable to load section details");
    } finally {
      setLearnMoreLoading(false);
    }
  };

  const submitStep = async (step, payload, successMessage) => {
    setSubmittingStepId(step.id);
    try {
      const response = await onboardingAPI.post(`/onboarding/step/${step.id}`, payload, {
        headers: {
          Authorization: `Bearer ${activeAuthToken}`,
        },
      });
      setPortalData(response.data);

      if (response.data?.mode === "portal" && response.data.selectedInstance?.currentStepId) {
        setSelectedStepId(response.data.selectedInstance.currentStepId);
      }

      setStepFocusKey("");
      toast.success(successMessage);
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to update onboarding step");
    } finally {
      setSubmittingStepId("");
    }
  };

  if (blockedToken) {
    return (
      <FallbackScreen
        blockedToken={blockedToken}
        onContinueWithSession={handleContinueWithSession}
        navigate={navigate}
      />
    );
  }

  if (loading) {
    return <PortalSkeleton />;
  }

  if (!activeAuthToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f8fc] px-4">
        <div className="max-w-xl rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Login required</h1>
          <p className="mt-3 text-sm text-slate-500">
            Open onboarding from TalentX, or sign in again to load your onboarding workflows.
          </p>
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="mt-6 inline-flex items-center gap-2 rounded-[18px] bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            <LoginRoundedIcon sx={{ fontSize: 18 }} />
            Go To Login
          </button>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f8fc] px-4">
        <div className="max-w-xl rounded-[28px] border border-rose-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Unable to load onboarding</h1>
          <p className="mt-3 text-sm text-slate-500">{fetchError}</p>
        </div>
      </div>
    );
  }

  if (portalData?.mode === "selector") {
    return <SelectorScreen data={portalData} onSelectCompany={handleSelectCompany} />;
  }

  if (portalData?.mode === "empty") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f8fc] px-4">
        <div className="max-w-xl rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">No onboarding workflow yet</h1>
          <p className="mt-3 text-sm text-slate-500">
            Your offer is not ready for onboarding yet. Once a company activates your onboarding workflow, it will appear here automatically.
          </p>
          <button
            type="button"
            onClick={() => navigate("/student/dashboard")}
            className="mt-6 rounded-[18px] bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            Back To Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (portalData?.mode === "portal" && selectedInstance?.acceptanceFlow && !selectedInstance.acceptanceFlow.isOfferAccepted) {
    return (
      <AcceptOfferWizard
        selectedInstance={selectedInstance}
        user={portalData.user}
        authToken={activeAuthToken}
        onCancel={handleWizardCancel}
        onAccepted={handleWizardAccepted}
      />
    );
  }

  return (
    <OnboardingLayout
      header={(
        <TopHeader
          companies={portalData.companies}
          selectedInstance={selectedInstance}
          user={portalData.user}
          onSelectCompany={handleSelectCompany}
          onBackToDashboard={() => navigate("/student/dashboard")}
        />
      )}
      sidebar={(
        <StepperSidebar
          steps={selectedInstance.steps}
          activeStepId={activeStep?.id || selectedInstance.currentStepId}
          completedCount={selectedInstance.progress.completed}
          totalCount={selectedInstance.progress.total}
          deadline={selectedInstance.deadline}
          onSelectStep={(stepId) => openStepView(stepId)}
        />
      )}
    >
      <div key={`${viewMode}-${activeStep?.id || "dashboard"}`} className="transition-all duration-300">
        {viewMode === "dashboard" && (
          <DashboardCards
            activeCardKey={learnMoreSectionKey}
            onOpenCard={handleOpenCard}
            onBackToDashboard={() => navigate("/student/dashboard")}
          />
        )}

        {viewMode === "learn-more" && (
          <LearnMoreSectionView
            sectionKey={learnMoreSectionKey}
            payload={learnMorePayload}
            loading={learnMoreLoading}
            onBack={() => setViewMode("dashboard")}
          />
        )}

        {viewMode === "step" && activeStep && (
          <StepContentRenderer activeStep={activeStep} onBack={handleBackToDashboard}>
            {activeStep.type === "offer_acceptance" && (
              <OfferStepView
                step={activeStep}
                onSubmit={(payload) => submitStep(activeStep, payload, "Offer accepted successfully")}
                isSubmitting={submittingStepId === activeStep.id}
              />
            )}

            {activeStep.type === "document_collection" && (
              <DocumentStepView
                step={activeStep}
                instanceId={selectedInstance.id}
                authToken={activeAuthToken}
                onSubmitStep={(payload) => submitStep(activeStep, payload, activeStep.status === "rejected" ? "Documents resubmitted" : "Documents submitted for review")}
                isSubmitting={submittingStepId === activeStep.id}
              />
            )}

            {activeStep.type === "pre_joining" && (
              <PreJoiningStepView
                step={activeStep}
                onSubmit={(payload) => submitStep(activeStep, payload, "Pre-joining tasks completed")}
                instanceId={selectedInstance.id}
                authToken={activeAuthToken}
                companyName={selectedInstance.companyName}
                jobTitle={selectedInstance.job?.title || ""}
                initialFocusTaskKey={stepFocusKey}
                isSubmitting={submittingStepId === activeStep.id}
              />
            )}

            {activeStep.type === "day_one_info" && (
              <DayOneStepView instance={selectedInstance} step={activeStep} />
            )}
          </StepContentRenderer>
        )}
      </div>
    </OnboardingLayout>
  );
}
