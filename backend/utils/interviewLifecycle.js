function buildEmptyInterviewJoinRequest() {
  return {
    status: "NONE",
    requestedBy: null,
    requestedAt: null,
    decisionBy: null,
    decidedAt: null,
    rejectReason: ""
  };
}

function clearInterviewJoinRequest(app) {
  if (!app) return buildEmptyInterviewJoinRequest();
  app.interviewJoinRequest = buildEmptyInterviewJoinRequest();
  return app.interviewJoinRequest;
}

function buildEmptyInterviewSession() {
  return {
    endedAt: null,
    endedBy: null
  };
}

function clearInterviewSession(app) {
  if (!app) return buildEmptyInterviewSession();
  app.interviewSession = buildEmptyInterviewSession();
  return app.interviewSession;
}

function hasInterviewSessionEnded(app) {
  return Boolean(app?.interviewSession?.endedAt);
}

module.exports = {
  buildEmptyInterviewJoinRequest,
  clearInterviewJoinRequest,
  buildEmptyInterviewSession,
  clearInterviewSession,
  hasInterviewSessionEnded
};
