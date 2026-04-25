// Phase 3.3: Animated skeleton loader for the onboarding portal
export default function PortalSkeleton() {
  return (
    <div className="min-h-screen bg-[#f6f8fc]">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 animate-pulse rounded-2xl bg-slate-200" />
            <div className="space-y-2">
              <div className="h-5 w-24 animate-pulse rounded-lg bg-slate-200" />
              <div className="h-3 w-32 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-44 animate-pulse rounded-full bg-slate-100" />
            <div className="h-11 w-11 animate-pulse rounded-2xl bg-slate-200" />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:px-8 lg:py-8">
        <aside className="w-full lg:max-w-[295px]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 space-y-4">
            <div className="h-6 w-44 animate-pulse rounded-lg bg-slate-200" />
            <div className="h-2 w-full animate-pulse rounded-full bg-slate-200" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-[18px] border border-slate-100 bg-slate-50 p-4">
                <div className="h-8 w-8 animate-pulse rounded-full bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
                  <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className="min-w-0 flex-1 rounded-[30px] border border-slate-200 bg-white p-5 sm:p-7 lg:p-8 space-y-6">
          <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-4 w-96 animate-pulse rounded bg-slate-100" />

          <div className="rounded-[22px] border border-slate-100 animate-pulse bg-slate-50 p-5 space-y-3">
            <div className="h-4 w-40 rounded bg-slate-200" />
            <div className="h-3 w-full rounded bg-slate-100" />
            <div className="h-3 w-3/4 rounded bg-slate-100" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-[24px] border border-slate-100 bg-slate-50 p-5 space-y-3">
                <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
                <div className="h-6 w-32 animate-pulse rounded bg-slate-200" />
              </div>
            ))}
          </div>

          <div className="h-12 w-48 animate-pulse rounded-[18px] bg-slate-200" />
        </main>
      </div>
    </div>
  );
}
