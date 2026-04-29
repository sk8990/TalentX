export default function SuperAdminSettingsPage() {
  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="tx-page-header p-5 sm:p-6 md:p-8">
        <h1 className="text-2xl font-black text-slate-950 sm:text-3xl">Super Admin Settings</h1>
        <p className="mt-2 text-sm text-slate-500">
          Platform-level settings can be extended from this section.
        </p>
      </header>

      <section className="tx-card p-5 sm:p-6">
        <h2 className="text-lg font-bold text-slate-900">Configuration Placeholder</h2>
        <p className="mt-2 text-sm text-slate-500">
          Add global controls here such as payment webhooks, default package setup, and alert preferences.
        </p>
      </section>
    </div>
  );
}
