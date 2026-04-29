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
  { value: "student", label: "Student" },
  { value: "recruiter", label: "Recruiter" },
  { value: "admin", label: "Admin" },
  { value: "university", label: "University" }
];

const BILLING_CYCLE_OPTIONS = ["monthly", "yearly", "one_time", "custom", "forever"];
const BUTTON_ACTION_OPTIONS = ["get_started", "start_hiring", "upgrade", "contact_sales"];

const STUDENT_ENTITLEMENTS = [
  "studentProfile",
  "jobApplications",
  "applicationTracking",
  "assessmentAccess",
  "interviewTracking",
  "offerAcceptance",
  "onboardingPortal"
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

function normalizeFormFromPackage(pkg) {
  return {
    name: pkg?.name || "",
    key: pkg?.key || "",
    description: pkg?.description || "",
    roleTarget: pkg?.roleTarget || "recruiter",
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
    entitlements: { ...(pkg?.entitlements || {}) }
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
    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
      <input type="checkbox" checked={Boolean(checked)} onChange={(event) => onChange(event.target.checked)} />
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

  const activePackages = useMemo(
    () => packages.filter((pkg) => pkg.isActive && pkg.isVisibleOnLandingPage).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)),
    [packages]
  );

  const allPackages = useMemo(
    () => [...packages].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0) || new Date(b.createdAt) - new Date(a.createdAt)),
    [packages]
  );

  const enterprisePackages = useMemo(
    () => packages.filter((pkg) => pkg.roleTarget === "university" || pkg.roleTarget === "admin"),
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

  const buildPayload = () => ({
    ...form,
    name: form.name.trim(),
    key: form.key.trim(),
    description: form.description.trim(),
    priceInPaise: toNumber(form.priceInPaise, 0),
    displayOrder: toNumber(form.displayOrder, 0),
    currency: String(form.currency || "INR").trim().toUpperCase(),
    razorpayPlanId: form.razorpayPlanId.trim(),
    label: form.label.trim(),
    buttonText: form.buttonText.trim(),
    entitlements: form.entitlements
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      const payload = buildPayload();
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
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
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
            <label className="text-sm text-slate-600 md:col-span-2 xl:col-span-3">
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

          <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-4">
            <BooleanEntitlement label="Active" checked={form.isActive} onChange={(value) => setField("isActive", value)} />
            <BooleanEntitlement label="Visible on Landing Page" checked={form.isVisibleOnLandingPage} onChange={(value) => setField("isVisibleOnLandingPage", value)} />

            {form.roleTarget === "recruiter" ? (
              <>
                <NumberEntitlement label="Job Creation Limit" value={form.entitlements.jobCreationLimit} onChange={(value) => setEntitlement("jobCreationLimit", value)} />
                <NumberEntitlement label="Interview Scheduling Limit" value={form.entitlements.interviewSchedulingLimit} onChange={(value) => setEntitlement("interviewSchedulingLimit", value)} />
                <NumberEntitlement label="Offer Letter Generation Limit" value={form.entitlements.offerLetterGenerationLimit} onChange={(value) => setEntitlement("offerLetterGenerationLimit", value)} />
                <NumberEntitlement label="Onboarding Panel Access Limit" value={form.entitlements.onboardingPanelAccessLimit} onChange={(value) => setEntitlement("onboardingPanelAccessLimit", value)} />
                <BooleanEntitlement label="Exclusive AI Support" checked={form.entitlements.exclusiveAiSupport} onChange={(value) => setEntitlement("exclusiveAiSupport", value)} />
              </>
            ) : null}

            {form.roleTarget === "university" || form.roleTarget === "admin" ? (
              <>
                <NumberEntitlement label="Manage Candidate Limit" value={form.entitlements.candidateManageLimit} onChange={(value) => setEntitlement("candidateManageLimit", value)} />
                <NumberEntitlement label="Manage Recruiter Limit" value={form.entitlements.recruiterManageLimit} onChange={(value) => setEntitlement("recruiterManageLimit", value)} />
                <NumberEntitlement label="Audit Limit" value={form.entitlements.auditLimit} onChange={(value) => setEntitlement("auditLimit", value)} />
                <BooleanEntitlement label="Delete Job Feature" checked={form.entitlements.deleteJobFeature} onChange={(value) => setEntitlement("deleteJobFeature", value)} />
              </>
            ) : null}

            {form.roleTarget === "student" ? STUDENT_ENTITLEMENTS.map((key) => (
              <BooleanEntitlement key={key} label={key} checked={form.entitlements[key]} onChange={(value) => setEntitlement(key, value)} />
            )) : null}
          </div>

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
                <th className="px-4 py-3">Label</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Button</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Landing</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((pkg) => (
                <tr key={pkg._id} className="border-t border-slate-100 align-top">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-800">{pkg.name}</p>
                    <p className="text-xs text-slate-500">{formatPlanLabel(pkg.key)}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{pkg.roleTarget}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{formatCurrencyInrPaisa(pkg.priceInPaise)}</td>
                  <td className="px-4 py-3 text-slate-700">{pkg.billingCycle}</td>
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
