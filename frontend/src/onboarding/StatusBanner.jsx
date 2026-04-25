import { statusBannerStyles } from "./constants";

export default function StatusBanner({ banner }) {
  if (!banner) return null;

  return (
    <div className={`rounded-[22px] border px-5 py-4 ${statusBannerStyles[banner.tone] || statusBannerStyles.info}`}>
      <p className="text-sm font-semibold">{banner.title}</p>
      <p className="mt-1 text-sm opacity-90">{banner.description}</p>
    </div>
  );
}
