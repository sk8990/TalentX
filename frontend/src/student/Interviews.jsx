import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import VideoCallIcon from "@mui/icons-material/VideoCall";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import RefreshIcon from "@mui/icons-material/Refresh";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import toast from "react-hot-toast";

async function requestFullscreenIfPossible() {
  const target = document.documentElement;
  const fn = target.requestFullscreen || target.webkitRequestFullscreen;
  if (!fn) return;

  try {
    await fn.call(target);
  } catch {
    // Fullscreen can be denied by the browser; navigation should still continue.
  }
}

export default function Interviews() {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState([]);
  const [slotOffers, setSlotOffers] = useState([]);
  const [nowMs, setNowMs] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookingKey, setBookingKey] = useState("");
  const [bookingDialog, setBookingDialog] = useState({
    open: false,
    applicationId: "",
    slot: null,
    jobTitle: "",
    companyName: "",
  });

  useEffect(() => {
    fetchInterviews();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const fetchInterviews = async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const [interviewRes, slotsRes] = await Promise.all([
        API.get("/application/my/interviews"),
        API.get("/application/my/interview-slots"),
      ]);

      const validInterviews = (interviewRes.data || []).filter(
        (app) => app.status === "INTERVIEW_SCHEDULED" && app.interview && app.interview.date
      );

      const validSlotOffers = (slotsRes.data || []).filter(
        (app) => Array.isArray(app.interviewSlots) && app.interviewSlots.length > 0
      );

      setInterviews(validInterviews);
      setSlotOffers(validSlotOffers);
    } catch (err) {
      console.error("Failed to fetch interviews", err);
      toast.error("Failed to load interviews");
    } finally {
      if (silent) setRefreshing(false);
      else setLoading(false);
    }
  };

  const bookSlot = async (applicationId, slotId) => {
    const key = `${applicationId}:${slotId}`;
    try {
      setBookingKey(key);
      await API.put(`/application/${applicationId}/interview/book`, { slotId });
      toast.success("Interview slot booked");
      fetchInterviews(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to book slot");
    } finally {
      setBookingKey("");
    }
  };

  const openBookingDialog = (applicationId, slot, job) => {
    setBookingDialog({
      open: true,
      applicationId,
      slot,
      jobTitle: job?.title || "Job Title",
      companyName: job?.companyName || "Company",
    });
  };

  const closeBookingDialog = () => {
    setBookingDialog({
      open: false,
      applicationId: "",
      slot: null,
      jobTitle: "",
      companyName: "",
    });
  };

  const confirmBooking = async () => {
    if (!bookingDialog.applicationId || !bookingDialog.slot?._id) {
      return;
    }

    await bookSlot(bookingDialog.applicationId, bookingDialog.slot._id);
    closeBookingDialog();
  };

  const joinInterview = async (applicationId) => {
    if (!applicationId) {
      toast.error("Interview room is unavailable");
      return;
    }

    await requestFullscreenIfPossible();
    navigate(`/student/interviews/${applicationId}/room`);
  };

  const sortedInterviews = useMemo(
    () => [...interviews].sort((a, b) => new Date(a.interview?.date).getTime() - new Date(b.interview?.date).getTime()),
    [interviews]
  );

  const upcomingInterviews = sortedInterviews.filter((app) => {
    const endTs = app.accessWindowEnd
      ? new Date(app.accessWindowEnd).getTime()
      : new Date(app.interview?.endDate || app.interview?.date).getTime();
    return Number.isFinite(endTs) && endTs >= nowMs;
  });
  const pastInterviews = sortedInterviews.filter((app) => {
    const endTs = app.accessWindowEnd
      ? new Date(app.accessWindowEnd).getTime()
      : new Date(app.interview?.endDate || app.interview?.date).getTime();
    return Number.isFinite(endTs) && endTs < nowMs;
  });

  if (loading) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading interviews...</div>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-cyan-600 px-6 py-8 text-white sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Interviews</h1>
            <p className="mt-2 text-sm text-indigo-100">Book interview slots and join your scheduled rounds.</p>
          </div>
          <button
            type="button"
            onClick={() => fetchInterviews(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1 rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshIcon sx={{ fontSize: 16 }} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </section>

      <SlotOfferSection offers={slotOffers} bookingKey={bookingKey} onRequestBook={openBookingDialog} />

      {sortedInterviews.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          No interviews scheduled yet.
        </div>
      ) : (
        <>
          <InterviewSection
            title={`Upcoming Interviews (${upcomingInterviews.length})`}
            emptyText="No upcoming interviews."
            items={upcomingInterviews}
            onJoin={joinInterview}
            past={false}
            nowMs={nowMs}
          />

          <InterviewSection
            title={`Past Interviews (${pastInterviews.length})`}
            emptyText="No past interviews."
            items={pastInterviews}
            onJoin={joinInterview}
            past
            nowMs={nowMs}
          />
        </>
      )}

      <Dialog
        open={bookingDialog.open}
        onClose={closeBookingDialog}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 3, border: "1px solid #e2e8f0" } }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: "#0f172a" }}>Confirm Slot Booking</DialogTitle>
        <DialogContent>
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">
              {bookingDialog.jobTitle} {bookingDialog.companyName ? `- ${bookingDialog.companyName}` : ""}
            </p>
            <p>Date & Time: {formatDateTime(bookingDialog.slot?.start)}</p>
            <p>Ends: {formatDateTime(bookingDialog.slot?.end)}</p>
            <p>Mode: {bookingDialog.slot?.mode || "N/A"}</p>
            <p>Panel: {formatPanelType(bookingDialog.slot?.panelType)}</p>
            {String(bookingDialog.slot?.panelType || "").trim().toUpperCase() === "AI" ? (
              <p>
                AI Config: {bookingDialog.slot?.aiConfig?.questionCount || 5} questions, {bookingDialog.slot?.aiConfig?.durationMinutes || 20} minutes, {bookingDialog.slot?.aiConfig?.difficulty || "MEDIUM"} difficulty
              </p>
            ) : null}
            {bookingDialog.slot?.link ? (
              <a
                href={bookingDialog.slot.link}
                target="_blank"
                rel="noreferrer"
                className="break-all text-indigo-600"
              >
                {bookingDialog.slot.link}
              </a>
            ) : null}
          </div>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeBookingDialog} variant="outlined" sx={{ textTransform: "none", borderRadius: 2 }}>
            Cancel
          </Button>
          <Button
            onClick={confirmBooking}
            variant="contained"
            disabled={bookingKey === `${bookingDialog.applicationId}:${bookingDialog.slot?._id}`}
            sx={{ textTransform: "none", borderRadius: 2, bgcolor: "#4f46e5", "&:hover": { bgcolor: "#4338ca" } }}
          >
            {bookingKey === `${bookingDialog.applicationId}:${bookingDialog.slot?._id}` ? "Booking..." : "Confirm Booking"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

function SlotOfferSection({ offers, bookingKey, onRequestBook }) {
  if (!offers.length) {
    return null;
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Pending Interview Slot Booking</h2>
      {offers.map((offer) => (
        <article key={offer._id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{offer.jobId?.companyName || "Company"}</p>
              <h3 className="text-xl font-semibold text-slate-900">{offer.jobId?.title || "Job Title"}</h3>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              {offer.interviewSlots.length} slots available
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {offer.interviewSlots.map((slot) => {
              const key = `${offer._id}:${slot._id}`;
              const busy = bookingKey === key;
              return (
                <div key={slot._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-800">{formatDateTime(slot.start)}</p>
                  <p className="mt-1 text-xs text-slate-600">Ends: {formatDateTime(slot.end)}</p>
                  <p className="mt-1 text-xs text-slate-600">Mode: {slot.mode}</p>
                  <p className="mt-1 text-xs font-semibold text-indigo-700">
                    Panel: {formatPanelType(slot.panelType)}
                  </p>
                  {slot.link ? (
                    <a href={slot.link} target="_blank" rel="noopener noreferrer" className="mt-1 block break-all text-xs font-semibold text-indigo-600">
                      {slot.link}
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onRequestBook(offer._id, slot, offer.jobId)}
                    disabled={busy}
                    className="mt-3 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {busy ? "Booking..." : "Book This Slot"}
                  </button>
                </div>
              );
            })}
          </div>
        </article>
      ))}
    </section>
  );
}

function InterviewSection({ title, emptyText, items, onJoin, past, nowMs }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {items.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">{emptyText}</div>
      ) : (
        <div className="space-y-4">
          {items.map((app) => (
            <InterviewCard key={app._id} app={app} onJoin={onJoin} past={past} nowMs={nowMs} />
          ))}
        </div>
      )}
    </section>
  );
}

function InterviewCard({ app, onJoin, past, nowMs }) {
  const interview = app.interview;
  const scheduleMeta = getScheduleMeta(interview?.date);
  const startTs = interview?.date ? new Date(interview.date).getTime() : 0;
  const derivedWindowStart = startTs ? startTs - 15 * 60 * 1000 : 0;
  const windowStartTs = app.accessWindowStart
    ? new Date(app.accessWindowStart).getTime()
    : derivedWindowStart;
  const windowEndTs = app.accessWindowEnd
    ? new Date(app.accessWindowEnd).getTime()
    : new Date(interview?.endDate || interview?.date || 0).getTime();
  const inRoomWindow = Number.isFinite(windowStartTs) && Number.isFinite(windowEndTs)
    ? nowMs >= windowStartTs && nowMs <= windowEndTs
    : false;
  const isOnline = String(interview?.mode || "").trim().toLowerCase() === "online";
  const canAccessRoom = Boolean(isOnline && inRoomWindow);
  const canJoin = canAccessRoom;
  const interviewStartValue = interview?.date || 0;
  const countdown = Math.max(
    0,
    Math.floor((new Date(interviewStartValue).getTime() - nowMs) / 1000)
  );
  const companyName = app.jobId?.companyName?.trim() || "";
  const jobTitle = app.jobId?.title || "Job Title";
  const panelType = formatPanelType(interview?.panelType);
  const calendarUrl = buildCalendarUrl({
    title: `${jobTitle} Interview`,
    start: interview?.date,
    end: interview?.endDate,
    mode: interview?.mode,
    link: interview?.link,
  });

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {companyName ? <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{companyName}</p> : null}
          <h3 className="text-xl font-semibold text-slate-900">{jobTitle}</h3>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-indigo-600">{panelType}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${scheduleMeta.badgeClass}`}>{scheduleMeta.label}</span>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
        <InfoCard label="Date & Time" value={formatDateTime(interview?.date)} />
        <InfoCard label="Mode" value={interview?.mode || "N/A"} />
        <InfoCard
          label={interview?.mode === "Online" ? "Virtual Panel" : "Venue"}
          value={
            interview?.mode === "Online"
              ? (canAccessRoom ? "In-app room unlocked" : "Room unlocks 15 minutes before start")
              : (interview?.link || "Not provided")
          }
        />
      </div>

      {!past && !canAccessRoom ? (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
          Room is locked. Countdown to start: {formatCountdown(countdown)}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          onClick={() => onJoin(app._id)}
          disabled={!canJoin}
          className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
        >
          <span className="inline-flex items-center gap-1">
            <VideoCallIcon sx={{ fontSize: 16 }} />
            {past ? "Interview Completed" : canJoin ? `Join ${panelType}` : "Join Unavailable"}
          </span>
        </button>
        <a
          href={calendarUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          <span className="inline-flex items-center gap-1">
            <EventAvailableIcon sx={{ fontSize: 16 }} />
            Add to Calendar
          </span>
        </a>
      </div>
    </article>
  );
}

function InfoCard({ label, value, isLink = false }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      {isLink ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="mt-2 block break-all font-semibold text-indigo-600 hover:text-indigo-700">
          {value}
        </a>
      ) : (
        <p className="mt-2 font-semibold text-slate-800">{value}</p>
      )}
    </div>
  );
}

function formatDateTime(date) {
  if (!date) return "Not scheduled";
  return new Date(date).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCountdown(totalSeconds) {
  const safeSeconds = Math.max(0, Number(totalSeconds || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

function getScheduleMeta(date) {
  const interviewDate = date ? new Date(date) : null;
  if (!interviewDate || Number.isNaN(interviewDate.getTime())) {
    return { label: "Unknown", badgeClass: "bg-slate-100 text-slate-700" };
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfInterviewDay = new Date(interviewDate.getFullYear(), interviewDate.getMonth(), interviewDate.getDate());
  const diffDays = Math.floor((startOfInterviewDay.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { label: "Completed", badgeClass: "bg-slate-100 text-slate-700" };
  if (diffDays === 0) return { label: "Today", badgeClass: "bg-emerald-100 text-emerald-700" };
  if (diffDays === 1) return { label: "Tomorrow", badgeClass: "bg-amber-100 text-amber-700" };
  return { label: `In ${diffDays} days`, badgeClass: "bg-indigo-100 text-indigo-700" };
}

function toGoogleDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function buildCalendarUrl({ title, start, end, mode, link }) {
  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : startDate ? new Date(startDate.getTime() + 30 * 60 * 1000) : null;

  const startStamp = toGoogleDate(startDate);
  const endStamp = toGoogleDate(endDate);
  const details = link ? `Interview mode: ${mode || "N/A"}\\nLink: ${link}` : `Interview mode: ${mode || "N/A"}`;
  const location = mode === "Online" ? "Online" : (link || "TBD");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title || "Interview",
    dates: `${startStamp}/${endStamp}`,
    details,
    location,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function formatPanelType(value) {
  return String(value || "HUMAN").trim().toUpperCase() === "AI" ? "AI Interview Panel" : "Human Interview";
}
