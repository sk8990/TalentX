import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  createPackage,
  getEnterpriseRequests,
  getPackages,
  handleEnterpriseRequest,
  togglePackageLandingVisibility,
  togglePackageStatus,
  updatePackage
} from "../../api/superAdminApi";
import {
  formatCurrencyInrPaisa,
  formatDateTime,
  formatPlanLabel,
  statusToneClass
} from "./superAdminUtils";

const ROLE_TARGET_OPTIONS = [
  { label: "Student", value: "student" },
  { label: "Recruiter", value: "recruiter" },
  { label: "University", value: "university_admin" }
];

const ROLE_TARGET_LABELS = {
  student: "Student",
  recruiter: "Recruiter",
  university_admin: "University",
  admin: "University",
  university: "University"
};

const UNIVERSITY_ROLE_TARGETS = new Set(["university_admin", "admin", "university"]);

const BILLING_CYCLE_OPTIONS = ["monthly", "yearly", "one_time", "custom", "forever"];
const BUTTON_ACTION_OPTIONS = ["get_started", "start_hiring", "upgrade", "contact_sales"];

const STUDENT_FEATURES = [
  { key: "studentProfile", label: "Student Profile" },
  { key: "jobApplications", label: "Job Applications" },
  { key: "applicationTracking", label: "Application Tracking" },
  { key: "assessmentAccess", label: "Assessment Access" },
  { key: "interviewTracking", label: "Interview Tracking" },
  { key: "offerAcceptance", label: "Offer Acceptance" },
  { key: "onboardingPortal", label: "Onboarding Portal" }
];

const STUDENT_LIMITS = [
  { key: "jobApplyLimit", label: "Job Apply Limit" },
  { key: "aiInterviewLimit", label: "AI Interview / Assessment Limit" },
  { key: "resumeUploadLimit", label: "Resume Upload Limit" },
  { key: "offerAccessLimit", label: "Offer Access Limit" }
];

const RECRUITER_LIMITS = [
  { key: "jobCreationLimit", label: "Job Creation Limit" },
  { key: "interviewSchedulingLimit", label: "Interview Scheduling Limit" },
  { key: "offerLetterGenerationLimit", label: "Offer Letter Generation Limit" },
  { key: "onboardingPanelAccessLimit", label: "Onboarding Panel Access Limit" },
  { key: "applicantsPerMonth", label: "Applicant Monthly Limit" }
];

const RECRUITER_REQUIRED_LIMIT_KEYS = [
  "jobCreationLimit",
  "interviewSchedulingLimit",
  "offerLetterGenerationLimit",
  "onboardingPanelAccessLimit"
];

const UNIVERSITY_FEATURES = [
  { key: "manageStudents", label: "Manage Students" },
  { key: "collegeJobAccess", label: "College Job Access" },
  { key: "reportsAccess", label: "Reports Access" },
  { key: "placementExportAccess", label: "Placement Export Access" },
  { key: "recruiterVisibility", label: "Recruiter Visibility" },
  { key: "dedicatedSupport", label: "Enterprise Support" },
  { key: "customOnboardingWorkflows", label: "Custom Onboarding Workflows" },
  { key: "deleteJobFeature", label: "Delete Job Feature" }
];

const UNIVERSITY_LIMITS = [
  { key: "candidateManageLimit", label: "Student Approval Limit" },
  { key: "recruiterManageLimit", label: "Recruiter Access Limit" },
  { key: "auditLimit", label: "Report Access Limit" }
];

const LIMIT_LABELS = {
  jobApplyLimit: "Job Apply Limit",
  aiInterviewLimit: "AI Interview / Assessment Limit",
  resumeUploadLimit: "Resume Upload Limit",
  offerAccessLimit: "Offer Access Limit",
  jobCreationLimit: "Job Creation Limit",
  interviewSchedulingLimit: "Interview Scheduling Limit",
  offerLetterGenerationLimit: "Offer Letter Generation Limit",
  onboardingPanelAccessLimit: "Onboarding Panel Access Limit",
  applicantsPerMonth: "Applicant Monthly Limit",
  candidateManageLimit: "Student Approval Limit",
  recruiterManageLimit: "Recruiter Access Limit",
  auditLimit: "Report Access Limit"
};

const LIMIT_KEYS_BY_ROLE = {
  student: STUDENT_LIMITS.map((item) => item.key),
  recruiter: RECRUITER_REQUIRED_LIMIT_KEYS,
  university_admin: UNIVERSITY_LIMITS.map((item) => item.key),
  admin: UNIVERSITY_LIMITS.map((item) => item.key),
  university: UNIVERSITY_LIMITS.map((item) => item.key)
};

const ALL_LIMIT_KEYS = [
  ...STUDENT_LIMITS.map((item) => item.key),
  ...RECRUITER_LIMITS.map((item) => item.key),
  ...UNIVERSITY_LIMITS.map((item) => item.key)
];

const initialForm = {
  name: "",
  key: "",
  description: "",
  roleTarget: "recruiter",
  priceInPaise: "",
  currency: "INR",
  billingCycle: "monthly",
  razorpayPlanId: "",
  label: "",
  displayOrder: 0,
  buttonText: "",
  buttonActionType: "start_hiring",
  isActive: false,
  isVisibleOnLandingPage: false,
  entitlements: {}
};

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeRoleTargetValue(value) {
  const normalized = String(value || "").trim();
  if (normalized === "admin" || normalized === "university") {
    return "university_admin";
  }
  return normalized || "recruiter";
}

function getRoleTargetLabel(value) {
  const normalized = String(value || "").trim();
  return ROLE_TARGET_LABELS[normalized] || ROLE_TARGET_LABELS[normalizeRoleTargetValue(normalized)] || "Unknown";
}

function normalizeEntitlementsForForm(entitlements = {}) {
  const next = { ...entitlements };
  if (next.applicantsPerMonth === undefined && next.monthlyApplicants !== undefined) {
    next.applicantsPerMonth = next.monthlyApplicants;
  }
  return next;
}

function normalizeEntitlementsForPayload(entitlements = {}, roleTarget) {
  const next = { ...entitlements };
  const requiredKeys = new Set(LIMIT_KEYS_BY_ROLE[roleTarget] || []);
  const errors = [];

  ALL_LIMIT_KEYS.forEach((key) => {
    if (!(key in next)) {
      if (requiredKeys.has(key)) {
        next[key] = 0;
      }
      return;
    }

    const raw = next[key];
    if (raw === "" || raw === null || raw === undefined) {
      next[key] = 0;
      return;
    }

    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      errors.push(`${LIMIT_LABELS[key] || key} must be a number.`);
      return;
    }
    if (parsed < -1) {
      errors.push(`${LIMIT_LABELS[key] || key} must be -1 or greater.`);
      return;
    }
    next[key] = parsed;
  });

  if (next.applicantsPerMonth !== undefined && next.applicantsPerMonth !== null && next.applicantsPerMonth !== "") {
    delete next.monthlyApplicants;
  }

  return { entitlements: next, errors };
}

function normalizeFormFromPackage(pkg) {
  return {
    name: pkg?.name || "",
    key: pkg?.key || "",
    description: pkg?.description || "",
    roleTarget: normalizeRoleTargetValue(pkg?.roleTarget || "recruiter"),
    priceInPaise: String(pkg?.priceInPaise ?? ""),
    currency: pkg?.currency || "INR",
    billingCycle: pkg?.billingCycle || "monthly",
    razorpayPlanId: pkg?.razorpayPlanId || "",
    label: pkg?.label || "",
    displayOrder: pkg?.displayOrder ?? 0,
    buttonText: pkg?.buttonText || "",
    buttonActionType: pkg?.buttonActionType || "start_hiring",
    isActive: Boolean(pkg?.isActive),
    isVisibleOnLandingPage: Boolean(pkg?.isVisibleOnLandingPage),
    entitlements: normalizeEntitlementsForForm(pkg?.entitlements || {})
  };
}

function StatusBadge({ value }) {
  return <span className={statusToneClass(value)}>{value}</span>;
}

function NumberEntitlement({ label, value, onChange }) {
  return (
    <label className="text-sm text-slate-600">
      {label}
      <input
        type="number"
        min="-1"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value === "" ? "" : Number(event.target.value))}
        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
      />
    </label>
  );
}

function BooleanEntitlement({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
      />
      {label}
    </label>
  );
}

export default function PackagesPage() {
  const [packages, setPackages] = useState([]);
  const [enterpriseRequests, setEnterpriseRequests] = useState([]);
  const [assignmentByRequest, setAssignmentByRequest] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState("");
  const [form, setForm] = useState(initialForm);

  const isEditing = Boolean(editingPackageId);
  const normalizedRoleTarget = normalizeRoleTargetValue(form.roleTarget);
  const isStudentPackage = normalizedRoleTarget === "student";
  const isRecruiterPackage = normalizedRoleTarget === "recruiter";
  const isUniversityPackage = normalizedRoleTarget === "university_admin";

  const activePackages = useMemo(
    () => packages.filter((pkg) => pkg.isActive && pkg.isVisibleOnLandingPage).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)),
    [packages]
  );

  const allPackages = useMemo(
    () => [...packages].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0) || new Date(b.createdAt) - new Date(a.createdAt)),
    [packages]
  );

  const enterprisePackages = useMemo(
    () => packages.filter((pkg) => UNIVERSITY_ROLE_TARGETS.has(pkg.roleTarget)),
    [packages]
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const [packagesResponse, requestsResponse] = await Promise.all([
        getPackages(),
        getEnterpriseRequests()
      ]);
      setPackages(Array.isArray(packagesResponse?.packages) ? packagesResponse.packages : []);
      setEnterpriseRequests(Array.isArray(requestsResponse?.requests) ? requestsResponse.requests : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load package management data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setEditingPackageId("");
    setForm(initialForm);
  };

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const setEntitlement = (field, value) => {
    setForm((prev) => ({
      ...prev,
      entitlements: {
        ...prev.entitlements,
        [field]: value
      }
    }));
  };

  const buildPayload = (overrides = {}) => {
    const merged = { ...form, ...overrides };
    return {
      ...merged,
      roleTarget: normalizeRoleTargetValue(merged.roleTarget),
      name: merged.name.trim(),
      key: merged.key.trim(),
      description: merged.description.trim(),
      priceInPaise: toNumber(merged.priceInPaise, 0),
      displayOrder: toNumber(merged.displayOrder, 0),
      currency: String(merged.currency || "INR").trim().toUpperCase(),
      razorpayPlanId: merged.razorpayPlanId.trim(),
      label: merged.label.trim(),
      buttonText: merged.buttonText.trim(),
      entitlements: merged.entitlements
    };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const { entitlements, errors } = normalizeEntitlementsForPayload(form.entitlements, normalizedRoleTarget);
    if (errors.length) {
      toast.error(errors[0]);
      return;
    }
    try {
      setSaving(true);
      const payload = buildPayload({ roleTarget: normalizedRoleTarget, entitlements });
      if (isEditing) {
        await updatePackage(editingPackageId, payload);
        toast.success("Package updated successfully");
      } else {
        await createPackage(payload);
        toast.success("Package created successfully");
      }
      resetForm();
      await loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to save package");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (pkg) => {
    setEditingPackageId(pkg._id);
    setForm(normalizeFormFromPackage(pkg));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStatusToggle = async (pkg) => {
    try {
      await togglePackageStatus(pkg._id, !pkg.isActive);
      await loadData();
      toast.success(`Package ${pkg.isActive ? "deactivated" : "activated"}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to update package");
    }
  };

  const handleVisibilityToggle = async (pkg) => {
    try {
      await togglePackageLandingVisibility(pkg._id, !pkg.isVisibleOnLandingPage);
      await loadData();
      toast.success(pkg.isVisibleOnLandingPage ? "Hidden from landing page" : "Visible on landing page");
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to update landing visibility");
    }
  };

  const reviewEnterpriseRequest = async (request, status) => {
    try {
      const assignedPackageId = assignmentByRequest[request._id] || enterprisePackages[0]?._id || "";
      await handleEnterpriseRequest(request._id, { status, assignedPackageId: status === "approved" ? assignedPackageId : undefined });
      await loadData();
      toast.success(status === "approved" ? "Enterprise request approved" : "Enterprise request rejected");
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to review enterprise request");
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="tx-page-header p-5 sm:p-6 md:p-8">
        <h1 className="text-2xl font-black text-slate-950 sm:text-3xl">Platform Packages</h1>
        <p className="mt-2 text-sm text-slate-500">
          Create packages, publish pricing cards, and review enterprise requests.
        </p>
      </header>

      <section className="tx-card p-4 sm:p-6">
        <h2 className="text-lg font-bold text-slate-900">{isEditing ? "Edit Package" : "Create Package"}</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-5">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm text-slate-600">
              Name
              <input required value={form.name} onChange={(event) => setField("name", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-slate-600">
              Key
              <input required value={form.key} onChange={(event) => setField("key", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-slate-600">
              Role Target
              <select value={form.roleTarget} onChange={(event) => setField("roleTarget", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
                {ROLE_TARGET_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="text-sm text-slate-600 md:col-span-2 lg:col-span-3">
              Description
              <textarea value={form.description} onChange={(event) => setField("description", event.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-slate-600">
              Price in Paise
              <input type="number" min="0" value={form.priceInPaise} onChange={(event) => setField("priceInPaise", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-slate-600">
              Currency
              <input value={form.currency} onChange={(event) => setField("currency", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-slate-600">
              Billing Cycle
              <select value={form.billingCycle} onChange={(event) => setField("billingCycle", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
                {BILLING_CYCLE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <label className="text-sm text-slate-600">
              Razorpay Plan ID
              <input value={form.razorpayPlanId} onChange={(event) => setField("razorpayPlanId", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-slate-600">
              Label
              <input value={form.label} onChange={(event) => setField("label", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-slate-600">
              Display Order
              <input type="number" min="0" value={form.displayOrder} onChange={(event) => setField("displayOrder", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-slate-600">
              Button Text
              <input value={form.buttonText} onChange={(event) => setField("buttonText", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-slate-600">
              Button Action Type
              <select value={form.buttonActionType} onChange={(event) => setField("buttonActionType", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
                {BUTTON_ACTION_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-sm font-bold text-slate-800">Package Status</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <BooleanEntitlement label="Active" checked={form.isActive} onChange={(value) => setField("isActive", value)} />
              <BooleanEntitlement label="Visible on Landing Page" checked={form.isVisibleOnLandingPage} onChange={(value) => setField("isVisibleOnLandingPage", value)} />
              {isRecruiterPackage ? (
                <BooleanEntitlement label="Exclusive AI Support" checked={form.entitlements.exclusiveAiSupport} onChange={(value) => setEntitlement("exclusiveAiSupport", value)} />
              ) : null}
            </div>
          </section>

          {isStudentPackage ? (
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-sm font-bold text-slate-800">Student Features</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {STUDENT_FEATURES.map((feature) => (
                  <BooleanEntitlement
                    key={feature.key}
                    label={feature.label}
                    checked={form.entitlements[feature.key]}
                    onChange={(value) => setEntitlement(feature.key, value)}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {isStudentPackage ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Student Limits</h3>
                <p className="mt-1 text-xs text-slate-500">Use -1 for unlimited. Use 0 to disable a feature.</p>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {STUDENT_LIMITS.map((limit) => (
                  <NumberEntitlement
                    key={limit.key}
                    label={limit.label}
                    value={form.entitlements[limit.key]}
                    onChange={(value) => setEntitlement(limit.key, value)}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {isRecruiterPackage ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Recruiter Limits</h3>
                <p className="mt-1 text-xs text-slate-500">Use -1 for unlimited. Use 0 to disable a feature.</p>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {RECRUITER_LIMITS.filter((limit) => {
                  if (limit.key !== "applicantsPerMonth") return true;
                  return Object.prototype.hasOwnProperty.call(form.entitlements, "applicantsPerMonth");
                }).map((limit) => (
                  <NumberEntitlement
                    key={limit.key}
                    label={limit.label}
                    value={form.entitlements[limit.key]}
                    onChange={(value) => setEntitlement(limit.key, value)}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {isUniversityPackage ? (
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-sm font-bold text-slate-800">University Features</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {UNIVERSITY_FEATURES.map((feature) => (
                  <BooleanEntitlement
                    key={feature.key}
                    label={feature.label}
                    checked={form.entitlements[feature.key]}
                    onChange={(value) => setEntitlement(feature.key, value)}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {isUniversityPackage ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <div>
                <h3 className="text-sm font-bold text-slate-800">University Limits</h3>
                <p className="mt-1 text-xs text-slate-500">Use -1 for unlimited.</p>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {UNIVERSITY_LIMITS.map((limit) => (
                  <NumberEntitlement
                    key={limit.key}
                    label={limit.label}
                    value={form.entitlements[limit.key]}
                    onChange={(value) => setEntitlement(limit.key, value)}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={saving} className="tx-button-primary px-4 py-2 text-sm disabled:opacity-60">
              {saving ? "Saving..." : isEditing ? "Update Package" : "Create Package"}
            </button>
            {isEditing ? <button type="button" onClick={resetForm} className="tx-button-secondary px-4 py-2 text-sm">Cancel Edit</button> : null}
          </div>
        </form>
      </section>

      <PackageTable
        title="Active Packages"
        rows={activePackages}
        loading={loading}
        emptyText="No packages are currently live on the landing page."
        onEdit={handleEdit}
        onStatusToggle={handleStatusToggle}
        onVisibilityToggle={handleVisibilityToggle}
      />

      <PackageTable
        title="All Packages"
        rows={allPackages}
        loading={loading}
        emptyText="No packages available."
        onEdit={handleEdit}
        onStatusToggle={handleStatusToggle}
        onVisibilityToggle={handleVisibilityToggle}
      />

      <section className="tx-card overflow-hidden">
        <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
          <h2 className="text-lg font-bold text-slate-900">Enterprise Requests</h2>
        </div>
        {loading ? (
          <div className="p-5 text-sm text-slate-500">Loading requests...</div>
        ) : enterpriseRequests.length === 0 ? (
          <div className="p-5 text-sm text-slate-500">No enterprise requests yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Organization</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Expected</th>
                  <th className="px-4 py-3">Message</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Assign Package</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {enterpriseRequests.map((request) => (
                  <tr key={request._id} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{request.organizationName || "-"}</p>
                      <p className="text-xs text-slate-500">{formatDateTime(request.createdAt)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{request.requesterName || request.name || "-"}</p>
                      <p className="text-xs text-slate-500">{request.email || "-"}</p>
                      <p className="text-xs text-slate-500">{request.phone || "-"}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <p>Candidates: {request.expectedCandidates ?? "-"}</p>
                      <p>Recruiters: {request.expectedRecruiters ?? "-"}</p>
                    </td>
                    <td className="max-w-xs px-4 py-3 text-slate-600">{request.message || "-"}</td>
                    <td className="px-4 py-3"><StatusBadge value={request.status || "pending"} /></td>
                    <td className="px-4 py-3">
                      <select
                        value={assignmentByRequest[request._id] || request.assignedPackageId?._id || enterprisePackages[0]?._id || ""}
                        onChange={(event) => setAssignmentByRequest((prev) => ({ ...prev, [request._id]: event.target.value }))}
                        className="w-56 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                        disabled={request.status === "approved"}
                      >
                        {enterprisePackages.map((pkg) => <option key={pkg._id} value={pkg._id}>{pkg.name}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" disabled={request.status === "approved"} onClick={() => reviewEnterpriseRequest(request, "approved")} className="tx-button-primary px-3 py-2 text-xs disabled:opacity-50">Approve</button>
                        <button type="button" disabled={request.status === "rejected"} onClick={() => reviewEnterpriseRequest(request, "rejected")} className="tx-button-secondary px-3 py-2 text-xs disabled:opacity-50">Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

const LIMIT_SUMMARY_CONFIG = {
  student: STUDENT_LIMITS,
  recruiter: RECRUITER_LIMITS,
  university_admin: UNIVERSITY_LIMITS,
  admin: UNIVERSITY_LIMITS,
  university: UNIVERSITY_LIMITS
};

function formatLimitSummaryValue(raw) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return null;
  if (parsed === -1) return "Unlimited";
  return parsed.toLocaleString("en-IN");
}

function getLimitSummary(entitlements = {}, roleTarget) {
  const config = LIMIT_SUMMARY_CONFIG[roleTarget] || [];
  const items = config
    .map((item) => {
      const displayValue = formatLimitSummaryValue(entitlements[item.key]);
      if (!displayValue) return null;
      return `${item.label}: ${displayValue}`;
    })
    .filter(Boolean);
  return items.length ? items : null;
}

function PackageTable({ title, rows, loading, emptyText, onEdit, onStatusToggle, onVisibilityToggle }) {
  return (
    <section className="tx-card overflow-hidden">
      <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      </div>
      {loading ? (
        <div className="p-5 text-sm text-slate-500">Loading packages...</div>
      ) : rows.length === 0 ? (
        <div className="p-5 text-sm text-slate-500">{emptyText}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Billing</th>
                <th className="px-4 py-3">Limits</th>
                <th className="px-4 py-3">Label</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Button</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Landing</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((pkg) => {
                const roleTarget = normalizeRoleTargetValue(pkg.roleTarget);
                const limitSummary = getLimitSummary(pkg.entitlements || {}, roleTarget);
                return (
                  <tr key={pkg._id} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{pkg.name}</p>
                      <p className="text-xs text-slate-500">{formatPlanLabel(pkg.key)}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{getRoleTargetLabel(pkg.roleTarget)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{formatCurrencyInrPaisa(pkg.priceInPaise)}</td>
                    <td className="px-4 py-3 text-slate-700">{pkg.billingCycle}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {limitSummary ? (
                        <div className="space-y-1 text-xs text-slate-600">
                          {limitSummary.map((item) => <div key={item}>{item}</div>)}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{pkg.label || "-"}</td>
                    <td className="px-4 py-3 text-slate-700">{pkg.displayOrder ?? 0}</td>
                    <td className="px-4 py-3 text-slate-700">{pkg.buttonText || "-"}</td>
                    <td className="px-4 py-3"><StatusBadge value={pkg.isActive ? "active" : "disabled"} /></td>
                    <td className="px-4 py-3"><StatusBadge value={pkg.isVisibleOnLandingPage ? "visible" : "hidden"} /></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => onEdit(pkg)} className="tx-button-secondary px-3 py-2 text-xs">Edit</button>
                        <button type="button" onClick={() => onVisibilityToggle(pkg)} className="tx-button-secondary px-3 py-2 text-xs">
                          {pkg.isVisibleOnLandingPage ? "Hide" : "Show"}
                        </button>
                        <button type="button" onClick={() => onStatusToggle(pkg)} className="tx-button-primary px-3 py-2 text-xs">
                          {pkg.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
