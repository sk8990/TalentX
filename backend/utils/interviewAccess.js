const DEFAULT_INTERVIEW_DURATION_MINUTES = 30;
const DEFAULT_JOIN_WINDOW_MINUTES = 15;

function getInterviewWindow(interview) {
  const start = interview?.date ? new Date(interview.date) : null;
  if (!start || Number.isNaN(start.getTime())) {
    return null;
  }

  const end = interview?.endDate
    ? new Date(interview.endDate)
    : new Date(start.getTime() + DEFAULT_INTERVIEW_DURATION_MINUTES * 60 * 1000);

  if (Number.isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
    return null;
  }

  return { start, end };
}

function isOnlineInterview(interview) {
  return String(interview?.mode || "").trim().toLowerCase() === "online";
}

function buildInterviewAccess(interview, options = {}) {
  const window = getInterviewWindow(interview);
  const nowTs = Number.isFinite(options.nowTs) ? Number(options.nowTs) : Date.now();
  const joinWindowMinutes = Number.isFinite(options.joinWindowMinutes)
    ? Number(options.joinWindowMinutes)
    : DEFAULT_JOIN_WINDOW_MINUTES;

  if (!window) {
    return {
      countdownSeconds: 0,
      canAccessRoom: false,
      canJoin: false,
      accessWindowStart: null,
      accessWindowEnd: null
    };
  }

  const accessWindowStart = new Date(window.start.getTime() - joinWindowMinutes * 60 * 1000);
  const accessWindowEnd = window.end;
  const countdownSeconds = Math.max(0, Math.floor((window.start.getTime() - nowTs) / 1000));
  const inRoomWindow =
    nowTs >= accessWindowStart.getTime() && nowTs <= accessWindowEnd.getTime();
  const online = isOnlineInterview(interview);

  return {
    countdownSeconds,
    canAccessRoom: Boolean(inRoomWindow && online),
    canJoin: Boolean(inRoomWindow && online),
    accessWindowStart,
    accessWindowEnd
  };
}

module.exports = {
  DEFAULT_INTERVIEW_DURATION_MINUTES,
  DEFAULT_JOIN_WINDOW_MINUTES,
  getInterviewWindow,
  isOnlineInterview,
  buildInterviewAccess
};
