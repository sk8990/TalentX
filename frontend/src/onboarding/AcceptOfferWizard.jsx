import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import BusinessCenterRoundedIcon from "@mui/icons-material/BusinessCenterRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import { TalentXMark } from "../components/TalentXBrand";
import { buildServerAssetUrl } from "./api";
import onboardingAPI from "./api";
import { getInitials } from "./constants";
import OnboardingStepper from "./OnboardingStepper";
import DocumentUploadCard from "./DocumentUploadCard";

function findStep(instance, type) {
  return (instance?.steps || []).find((step) => step.type === type) || null;
}

function formatDate(value) {
  if (!value) {
    return new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function buildDocumentMap(instance) {
  const documentStep = findStep(instance, "document_collection");
  const map = {};

  for (const item of documentStep?.content?.requiredDocuments || []) {
    if (item.document) {
      map[item.key] = item.document;
    }
  }

  return map;
}

function isDocumentAccepted(document) {
  return ["verified", "approved", "manual_review"].includes(document?.status);
}

function getVerificationLabel(status) {
  if (status === "verified") return "Verified";
  if (status === "manual_review") return "Manual Review";
  if (status === "action_required") return "Action Required";
  return "Pending";
}

function LetterPreview({ selectedInstance, user }) {
  const offerLetterUrl = selectedInstance?.offer?.offerLetterUrl;
  const companyName = selectedInstance?.companyName || "Company";
  const role = selectedInstance?.job?.title || "Offered Role";
  const candidateName = selectedInstance?.acceptanceFlow?.candidateName || user?.name || "Candidate";
  const companyInitials = getInitials(companyName);

  if (offerLetterUrl) {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100 p-4 shadow-sm">
        <iframe
          title={`${companyName} offer letter`}
          src={buildServerAssetUrl(offerLetterUrl)}
          className="h-[560px] w-full rounded-lg border border-slate-200 bg-white"
        />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="rounded-xl bg-slate-100 p-6 sm:p-8">
        <div className="mx-auto max-w-3xl bg-white px-6 py-8 shadow-sm sm:px-10">
          <div className="flex items-center gap-3 text-indigo-600">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-sm font-semibold">
              {companyInitials}
            </span>
            <span className="text-2xl font-semibold">{companyName}</span>
          </div>

          <h3 className="mt-8 text-center text-lg font-bold text-slate-950">Letter of Intent (LOI)</h3>
          <p className="mt-6 text-sm text-slate-700">Date: {formatDate(selectedInstance?.offer?.generatedAt)}</p>
          <p className="mt-5 text-sm text-slate-800">
            Dear <span className="font-semibold">{candidateName}</span>,
          </p>
          <div className="mt-4 space-y-4 text-sm leading-7 text-slate-800">
            <p>
              We are pleased to extend an offer for the role of <span className="font-semibold">{role}</span> at{" "}
              <span className="font-semibold">{companyName}</span>. This Letter of Intent summarizes the key terms for
              your onboarding journey through TalentX.
            </p>
            <p>
              Your joining location is {selectedInstance?.offer?.location || "to be confirmed"} and your expected joining
              date is {formatDate(selectedInstance?.offer?.joiningDate)}. The offer remains subject to successful
              verification of mandatory onboarding documents.
            </p>
            <p>
              We look forward to welcoming you to {companyName} and supporting your transition into the team.
            </p>
          </div>
          <p className="mt-8 text-sm font-semibold text-slate-900">Sincerely,</p>
          <p className="text-sm font-semibold text-slate-900">{companyName} HR Team</p>
        </div>
      </div>
    </div>
  );
}

function OfficialLetterStep({ selectedInstance, user, onAgree, onCancel }) {
  const offerLetterUrl = selectedInstance?.offer?.offerLetterUrl;

  const handleDownload = () => {
    if (offerLetterUrl) {
      window.open(buildServerAssetUrl(offerLetterUrl), "_blank", "noopener,noreferrer");
      return;
    }

    toast("Use your browser print dialog and choose Save as PDF.");
    window.print();
  };

  return (
    <div>
      <div className="px-4 py-4">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-lg font-semibold text-slate-950">Accept Offer</h1>
        </div>
      </div>

      <main className="bg-[#f6f7fb] px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-xl font-semibold text-slate-950">Letter Of Intent</h2>
          <div className="mt-6">
            <LetterPreview selectedInstance={selectedInstance} user={user} />
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <DownloadRoundedIcon sx={{ fontSize: 16 }} />
              Download As PDF
            </button>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-lg border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onAgree}
                className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                Yes, I Agree
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function DocumentsStep({
  selectedInstance,
  authToken,
  documents,
  onDocumentChange,
  onBack,
  onCancel,
  onContinue
}) {
  const requiredDocuments = selectedInstance?.acceptanceFlow?.requiredDocuments || [];
  const allAccepted = requiredDocuments.every((document) => isDocumentAccepted(documents[document.key]));

  return (
    <main className="bg-[#f6f7fb] px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-lg font-semibold text-slate-950">Documents for verification</h1>
        <p className="mt-2 text-sm text-slate-600">
          As a part of the verification process, you need to upload the following documents.
        </p>

        <div className="mt-6 space-y-4">
          {requiredDocuments.map((documentRequirement) => (
            <DocumentUploadCard
              key={documentRequirement.key}
              documentRequirement={documentRequirement}
              uploadedDocument={documents[documentRequirement.key]}
              instanceId={selectedInstance.id}
              authToken={authToken}
              onDocumentChange={onDocumentChange}
            />
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowBackRoundedIcon sx={{ fontSize: 16 }} />
            Back
          </button>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!allAccepted}
              onClick={onContinue}
              className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function FinalAcceptStep({
  selectedInstance,
  user,
  documents,
  onBack,
  onCancel,
  onAccept,
  accepting
}) {
  const requiredDocuments = selectedInstance?.acceptanceFlow?.requiredDocuments || [];
  const acceptedCount = requiredDocuments.filter((document) => isDocumentAccepted(documents[document.key])).length;
  const hasManualReview = requiredDocuments.some((document) => documents[document.key]?.status === "manual_review");
  const verificationStatus = hasManualReview ? "manual_review" : "verified";
  const companyName = selectedInstance?.companyName || "Company";

  return (
    <main className="min-h-[560px] bg-[#f6f7fb] px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-center text-xl font-semibold text-slate-950">Final Step</h1>

        <div className="mx-auto mt-10 max-w-xl rounded-xl border border-slate-100 bg-white p-6 text-center shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
          <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-100">
            <CheckCircleRoundedIcon sx={{ fontSize: 28 }} />
          </span>

          <h2 className="mt-8 text-lg font-semibold text-slate-950">
            Are you sure you want to accept this offer from {companyName}?
          </h2>

          <div className="mt-6 rounded-lg bg-slate-50 px-5 py-4 text-left text-sm">
            <div className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-3">
              <span className="text-slate-600">Company</span>
              <span className="font-medium text-slate-950">{companyName}</span>
              <span className="text-slate-600">Role</span>
              <span className="text-right font-medium text-slate-950">{selectedInstance?.job?.title || "Offer"}</span>
              <span className="text-slate-600">Student Name</span>
              <span className="text-right font-medium text-slate-950">{user?.name || selectedInstance?.acceptanceFlow?.candidateName}</span>
              <span className="text-slate-600">Documents Uploaded</span>
              <span className="font-medium text-slate-950">{acceptedCount}/{requiredDocuments.length}</span>
              <span className="text-slate-600">Verification Status</span>
              <span className="inline-flex items-center justify-end gap-1 font-medium text-emerald-700">
                <VerifiedRoundedIcon sx={{ fontSize: 15 }} />
                {getVerificationLabel(verificationStatus)}
              </span>
              <span className="text-slate-600">Offer Letter Agreement</span>
              <span className="font-medium text-emerald-700">Agreed</span>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-6 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Back
          </button>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onAccept}
              disabled={accepting}
              className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
            >
              {accepting ? "Accepting..." : "Accept Offer"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function AcceptOfferWizard({
  selectedInstance,
  user,
  authToken,
  onCancel,
  onAccepted
}) {
  const [activeStep, setActiveStep] = useState(0);
  const [documents, setDocuments] = useState(() => buildDocumentMap(selectedInstance));
  const [accepting, setAccepting] = useState(false);
  const companyName = selectedInstance?.companyName || "Company";

  useEffect(() => {
    setActiveStep(0);
    setDocuments(buildDocumentMap(selectedInstance));
  }, [selectedInstance]);

  const hasLogo = Boolean(selectedInstance?.companyLogo);
  const companyLogoUrl = hasLogo ? buildServerAssetUrl(selectedInstance.companyLogo) : "";
  const documentStep = useMemo(() => findStep(selectedInstance, "document_collection"), [selectedInstance]);

  const handleDocumentChange = (key, document) => {
    setDocuments((current) => ({
      ...current,
      [key]: document
    }));
  };

  const handleAcceptOffer = async () => {
    setAccepting(true);
    try {
      const response = await onboardingAPI.post(`/onboarding/${selectedInstance.id}/accept-offer`, {}, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });

      toast.success(response.data?.message || "Offer accepted successfully. Welcome to your onboarding journey.");
      onAccepted(response.data?.onboarding);
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to accept this offer right now.");
    } finally {
      setAccepting(false);
    }
  };

  if (!documentStep) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f7fb] px-4">
        <div className="max-w-lg rounded-xl border border-rose-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-slate-950">Document step unavailable</h1>
          <p className="mt-2 text-sm text-slate-600">Please contact the TalentX support team to continue onboarding.</p>
          <button
            type="button"
            onClick={onCancel}
            className="mt-6 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Back To Companies
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-slate-950">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <TalentXMark theme="light" size="sm" />
            <div>
              <p className="text-sm font-semibold text-slate-950">Accept Offer</p>
              <p className="text-xs text-slate-500">{companyName} onboarding</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
            {companyLogoUrl ? (
              <img src={companyLogoUrl} alt={companyName} className="h-8 w-8 rounded bg-white object-contain" />
            ) : (
              <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-indigo-50 text-xs font-semibold text-indigo-700">
                {getInitials(companyName)}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">{companyName}</p>
              <p className="truncate text-xs text-slate-500">
                <BusinessCenterRoundedIcon sx={{ fontSize: 13 }} /> {selectedInstance?.job?.title || "Offer"}
              </p>
            </div>
          </div>
        </div>
      </header>

      <OnboardingStepper activeStep={activeStep} />

      {activeStep === 0 && (
        <OfficialLetterStep
          selectedInstance={selectedInstance}
          user={user}
          onAgree={() => setActiveStep(1)}
          onCancel={onCancel}
        />
      )}

      {activeStep === 1 && (
        <DocumentsStep
          selectedInstance={selectedInstance}
          authToken={authToken}
          documents={documents}
          onDocumentChange={handleDocumentChange}
          onBack={() => setActiveStep(0)}
          onCancel={onCancel}
          onContinue={() => setActiveStep(2)}
        />
      )}

      {activeStep === 2 && (
        <FinalAcceptStep
          selectedInstance={selectedInstance}
          user={user}
          documents={documents}
          onBack={() => setActiveStep(1)}
          onCancel={onCancel}
          onAccept={handleAcceptOffer}
          accepting={accepting}
        />
      )}
    </div>
  );
}
