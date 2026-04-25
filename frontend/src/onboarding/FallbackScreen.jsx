import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import { TalentXMark } from "../components/TalentXBrand";

export default function FallbackScreen({ blockedToken, onContinueWithSession, navigate }) {
  const decoded = blockedToken?.decoded || {};
  const hasMainStudentSession = blockedToken?.hasMainStudentSession || false;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f8fc] px-4">
      <div className="max-w-xl rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
        <TalentXMark theme="light" size="md" />
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950">Onboarding Session Expired</h1>
        <p className="mt-3 text-sm text-slate-500">
          The onboarding link you used has expired.
          {decoded?.id && ` (Account: ${decoded.id})`}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {hasMainStudentSession && (
            <button
              type="button"
              onClick={onContinueWithSession}
              className="inline-flex items-center gap-2 rounded-[18px] bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              <ArrowForwardRoundedIcon sx={{ fontSize: 18 }} />
              Continue With My Session
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="inline-flex items-center gap-2 rounded-[18px] border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <LoginRoundedIcon sx={{ fontSize: 18 }} />
            Go To Login
          </button>
        </div>
      </div>
    </div>
  );
}
