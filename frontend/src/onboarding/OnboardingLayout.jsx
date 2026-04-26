export default function OnboardingLayout({ header, sidebar, children }) {
  return (
    <div className="min-h-screen bg-[#f4f6fb]">
      {header}
      <div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-3 py-4 sm:px-5 sm:py-6 lg:flex-row lg:gap-6 lg:px-8 lg:py-8">
        {sidebar}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
