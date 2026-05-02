import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { createCollegeAdmin, getCollegeAdmins, getColleges, getPackages } from "../../api/superAdminApi";
import { Pagination, formatDateTime } from "./superAdminUtils";

const emptyForm = {
  collegeId: "",
  adminName: "",
  adminEmail: "",
  password: "",
  packageId: "",
  planStartDate: "",
  planEndDate: ""
};

export default function CreateCollegeAdminPage() {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [colleges, setColleges] = useState([]);
  const [collegesLoading, setCollegesLoading] = useState(false);
  const [packages, setPackages] = useState([]);
  const [packagesLoading, setPackagesLoading] = useState(false);

  const fetchRows = async (page = 1) => {
    try {
      setLoading(true);
      const params = { page, limit: 20 };
      if (search) params.search = search;
      const response = await getCollegeAdmins(params);
      const items = response?.items || [];
      setRows(Array.isArray(items) ? items : []);
      setMeta({
        page: Number(response?.page || page),
        limit: Number(response?.limit || 20),
        total: Number(response?.total || 0),
        totalPages: Number(response?.totalPages || 1)
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load college admins");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows(1);
    fetchColleges();
    fetchPackages();
  }, []);

  const fetchColleges = async () => {
    try {
      setCollegesLoading(true);
      const response = await getColleges({ status: "active", limit: 100 });
      setColleges(response?.items || []);
    } catch (_err) {
      toast.error("Failed to load colleges");
    } finally {
      setCollegesLoading(false);
    }
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await createCollegeAdmin(form);
      if (result?.emailSent === false) {
        toast.success("College Admin created, but email could not be sent. Please share credentials manually.");
      } else {
        toast.success("College Admin created. Login credentials have been emailed.");
      }
      setForm(emptyForm);
      await fetchRows(1);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create College Admin");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    await fetchRows(1);
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="tx-page-header p-5 sm:p-6 md:p-8">
        <h1 className="text-2xl font-black text-slate-950 sm:text-3xl">College Admin Management</h1>
        <p className="mt-2 text-sm text-slate-500">Create college admins and view existing ones.</p>
      </header>

      <section className="tx-card p-4 sm:p-5">
        <h2 className="mb-4 text-lg font-bold text-slate-900">Create College Admin</h2>
        {colleges.length === 0 && !collegesLoading ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-semibold">No colleges available</p>
            <p className="mt-1 text-amber-600">Create a college/university first before creating a College Admin.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-600">
              Select College *
              <select
                required
                value={form.collegeId}
                onChange={(e) => setForm((p) => ({ ...p, collegeId: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                disabled={collegesLoading}
              >
                <option value="">{collegesLoading ? "Loading colleges..." : "Choose a college"}</option>
                {colleges.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} ({c.domain})
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-600">
              Admin Name *
              <input required value={form.adminName} onChange={(e) => setForm((p) => ({ ...p, adminName: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-slate-600">
              Admin Email *
              <input type="email" required value={form.adminEmail} onChange={(e) => setForm((p) => ({ ...p, adminEmail: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-slate-600">
              Temporary Password *
              <input type="password" required value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
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
            <div className="col-span-full pt-2">
              <button type="submit" disabled={submitting || colleges.length === 0} className="tx-button-primary px-5 py-2 text-sm disabled:opacity-60">
                {submitting ? "Creating..." : "Create College Admin"}
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="tx-card overflow-hidden">
        <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">College Admins</h2>
              <p className="text-xs text-slate-500">Total: {meta.total.toLocaleString("en-IN")}</p>
            </div>
            <form onSubmit={handleSearch} className="flex gap-2">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email" className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm" />
              <button type="submit" className="tx-button-primary px-3 py-1.5 text-xs">Search</button>
            </form>
          </div>
        </div>

        {loading ? (
          <div className="p-5 text-sm text-slate-500">Loading college admins...</div>
        ) : rows.length === 0 ? (
          <div className="p-5 text-sm text-slate-500">No college admins found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Admin</th>
                  <th className="px-4 py-3">College</th>
                  <th className="px-4 py-3">Domain</th>
                  <th className="px-4 py-3">Enterprise Plan</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((admin) => (
                  <tr key={admin._id} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{admin.name || "-"}</p>
                      <p className="text-xs text-slate-500">{admin.email || "-"}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{admin.collegeId?.name || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{admin.collegeId?.domain || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {admin.collegeId?.enterprisePlanActive ? "Active" : "Inactive"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {admin.isActive ? "Active" : "Disabled"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {formatDateTime(admin.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-4 pb-3 sm:px-5">
          <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={(p) => fetchRows(p)} />
        </div>
      </section>
    </div>
  );
}
