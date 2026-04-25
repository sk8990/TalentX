export default function OnboardingLayout({ header, sidebar, children }) {
  return (
    <div className="min-h-screen bg-[#f4f6fb]">
      {header}
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:px-8 lg:py-8">
        {sidebar}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
