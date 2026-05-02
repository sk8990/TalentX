import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useConfirmDialog } from "../../components/useConfirmDialog";
import {
  getColleges,
  createCollege,
  updateCollege,
  deleteCollege,
  getPackages
} from "../../api/superAdminApi";
import { Pagination, statusToneClass, formatDateTime } from "./superAdminUtils";

const emptyForm = {
  name: "",
  domain: "",
  packageId: "",
  planStartDate: "",
  planEndDate: "",
  status: "active"
};

const initialFilters = { search: "", status: "", limit: 20 };

export default function CollegesPage() {
  const { confirm, confirmDialog } = useConfirmDialog();
  const [filters, setFilters] = useState(initialFilters);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [packages, setPackages] = useState([]);
  const [packagesLoading, setPackagesLoading] = useState(false);

  const fetchRows = async (page = 1, activeFilters = filters) => {
    try {
      setLoading(true);
      const response = await getColleges({ ...activeFilters, page, limit: activeFilters.limit || 20 });
      const items = response?.items || [];
      setRows(Array.isArray(items) ? items : []);
      setMeta({
        page: Number(response?.page || page),
        limit: Number(response?.limit || activeFilters.limit || 20),
        total: Number(response?.total || 0),
        totalPages: Number(response?.totalPages || 1)
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load colleges");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows(1, filters);
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      setPackagesLoading(true);
      const response = await getPackages();
      const universityPackages = (response?.packages || []).filter(
        (pkg) => ["university_admin", "admin", "university"].includes(pkg.roleTarget) && pkg.isActive
      );
      setPackages(universityPackages);
    } catch (_err) {
      toast.error("Failed to load packages");
    } finally {
      setPackagesLoading(false);
    }
  };

  const applyFilters = async (e) => { e.preventDefault(); await fetchRows(1, filters); };

  const openCreate = () => { setEditId(null); setForm(emptyForm); setShowForm(true); };

  const openEdit = (college) => {
    setEditId(college._id);
    setForm({
      name: college.name || "",
      domain: college.domain || "",
      packageId: college.packageId || "",
      planStartDate: college.enterprisePlanStartDate ? college.enterprisePlanStartDate.slice(0, 10) : "",
      planEndDate: college.enterprisePlanEndDate ? college.enterprisePlanEndDate.slice(0, 10) : "",
      status: college.status || "active"
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editId) {
        await updateCollege(editId, form);
        toast.success("College updated successfully");
      } else {
        await createCollege(form);
        toast.success("College created successfully");
      }
      setShowForm(false);
      setEditId(null);
      setForm(emptyForm);
      await fetchRows(meta.page, filters);
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisable = async (college) => {
    const shouldDisable = await confirm({
      title: "Disable College",
      message: `This will set "${college.name}" status to inactive.`,
      confirmText: "Disable",
      cancelText: "Cancel",
      tone: "danger"
    });
    if (!shouldDisable) return;
    try {
      await deleteCollege(college._id);
      toast.success("College disabled");
      await fetchRows(meta.page, filters);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to disable college");
    }
  };

  return (
    <>
      <div className="space-y-5 sm:space-y-6">
        <header className="tx-page-header p-5 sm:p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black text-slate-950 sm:text-3xl">College Management</h1>
              <p className="mt-2 text-sm text-slate-500">Manage colleges, enterprise plans, and linked admins.</p>
            </div>
            <button type="button" onClick={openCreate} className="tx-button-primary px-4 py-2 text-sm">
              + Add College
            </button>
          </div>
        </header>

        {showForm && (
          <section className="tx-card p-4 sm:p-5">
            <h2 className="mb-4 text-lg font-bold text-slate-900">{editId ? "Edit College" : "Create College"}</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="text-sm text-slate-600">
                College Name *
                <input required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
              </label>
              <label className="text-sm text-slate-600">
                Domain * <span className="text-xs text-slate-400">(e.g. mit.edu.in)</span>
                <input required value={form.domain} onChange={(e) => setForm((p) => ({ ...p, domain: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
              </label>
              <label className="text-sm text-slate-600">
                Status
                <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                  <option value="expired">Expired</option>
                </select>
              </label>
              <label className="text-sm text-slate-600">
                Assign University Package
                <select
                  value={form.packageId}
                  onChange={(e) => setForm((p) => ({ ...p, packageId: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                  disabled={packagesLoading}
                >
                  <option value="">{packagesLoading ? "Loading packages..." : "No package (optional)"}</option>
                  {packages.map((pkg) => (
                    <option key={pkg._id} value={pkg._id}>
                      {pkg.name} - ₹{(pkg.priceInPaise / 100).toFixed(2)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-slate-600">
                Plan Start Date
                <input type="date" value={form.planStartDate} onChange={(e) => setForm((p) => ({ ...p, planStartDate: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
              </label>
              <label className="text-sm text-slate-600">
                Plan End Date
                <input type="date" value={form.planEndDate} onChange={(e) => setForm((p) => ({ ...p, planEndDate: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
              </label>
              <div className="col-span-full flex items-center gap-3 pt-2">
                <button type="submit" disabled={submitting} className="tx-button-primary px-5 py-2 text-sm disabled:opacity-60">
                  {submitting ? "Saving..." : editId ? "Update College" : "Create College"}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditId(null); }} className="tx-button-secondary px-4 py-2 text-sm">
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="tx-card p-4 sm:p-5">
          <form onSubmit={applyFilters} className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-sm text-slate-600">
              Search
              <input value={filters.search} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))} placeholder="College name or domain" className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-slate-600">
              Status
              <select value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
                <option value="expired">Expired</option>
              </select>
            </label>
            <label className="text-sm text-slate-600">
              Per Page
              <select value={filters.limit} onChange={(e) => setFilters((p) => ({ ...p, limit: Number(e.target.value) }))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
                {[10, 20, 50, 100].map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </label>
            <div className="flex items-end gap-2">
              <button type="submit" className="tx-button-primary px-4 py-2 text-sm">Apply</button>
              <button type="button" onClick={async () => { setFilters(initialFilters); await fetchRows(1, initialFilters); }} className="tx-button-secondary px-4 py-2 text-sm">Reset</button>
            </div>
          </form>
        </section>

        <section className="tx-card overflow-hidden">
          <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
            <h2 className="text-lg font-bold text-slate-900">Colleges</h2>
            <p className="text-xs text-slate-500">Total records: {meta.total.toLocaleString("en-IN")}</p>
          </div>

          {loading ? (
            <div className="p-5 text-sm text-slate-500">Loading colleges...</div>
          ) : rows.length === 0 ? (
            <div className="p-5 text-sm text-slate-500">No colleges found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">College</th>
                    <th className="px-4 py-3">Domain</th>
                    <th className="px-4 py-3">Enterprise Plan</th>
                    <th className="px-4 py-3">Plan Dates</th>
                    <th className="px-4 py-3">College Admin</th>
                    <th className="px-4 py-3">Students</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c._id} className="border-t border-slate-100 align-top">
                      <td className="px-4 py-3 font-semibold text-slate-800">{c.name || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{c.domain || "-"}</td>
                      <td className="px-4 py-3">
                        <span className={statusToneClass(c.enterprisePlanActive ? "active" : "disabled")}>
                          {c.enterprisePlanActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {c.enterprisePlanStartDate ? formatDateTime(c.enterprisePlanStartDate) : "-"}
                        <br />
                        {c.enterprisePlanEndDate ? formatDateTime(c.enterprisePlanEndDate) : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-700">{c.collegeAdminId?.name || "-"}</p>
                        <p className="text-xs text-slate-500">{c.collegeAdminId?.email || ""}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        <p>Total: {c.studentCount ?? 0}</p>
                        <p>Approved: {c.approvedStudents ?? 0}</p>
                        <p>Pending: {c.pendingStudents ?? 0}</p>
                        <p>Rejected: {c.rejectedStudents ?? 0}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={statusToneClass(c.status)}>{c.status || "-"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => openEdit(c)} className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                            Edit
                          </button>
                          {c.status !== "inactive" && (
                            <button type="button" onClick={() => handleDisable(c)} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">
                              Disable
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-4 pb-3 sm:px-5">
            <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={(p) => fetchRows(p, filters)} />
          </div>
        </section>
      </div>
      {confirmDialog}
    </>
  );
}
