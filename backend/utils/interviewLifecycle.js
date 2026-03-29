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

function buildDefaultAIInterviewConfig() {
  return {
    questionCount: 5,
    durationMinutes: 20,
    difficulty: "MEDIUM",
    focusAreas: []
  };
}

function buildEmptyAIInterview() {
  return {
    status: "NOT_STARTED",
    startedAt: null,
    endedAt: null,
    questionPlan: [],
    transcript: [],
    currentQuestionIndex: 0,
    summary: "",
    scores: {
      communication: null,
      technicalKnowledge: null,
      problemSolving: null,
      roleFit: null
    },
    recommendation: null,
    finalReport: "",
    lastError: ""
  };
}

function clearInterviewSession(app) {
  if (!app) return buildEmptyInterviewSession();
  app.interviewSession = buildEmptyInterviewSession();
  return app.interviewSession;
}

function clearAIInterview(app) {
  if (!app) return buildEmptyAIInterview();
  app.aiInterview = buildEmptyAIInterview();
  return app.aiInterview;
}

function hasInterviewSessionEnded(app) {
  return Boolean(app?.interviewSession?.endedAt);
}

function getInterviewPanelType(interview) {
  return String(interview?.panelType || "HUMAN").trim().toUpperCase() === "AI"
    ? "AI"
    : "HUMAN";
}

function isAIInterview(interview) {
  return getInterviewPanelType(interview) === "AI";
}

module.exports = {
  buildEmptyInterviewJoinRequest,
  clearInterviewJoinRequest,
  buildEmptyInterviewSession,
  clearInterviewSession,
  buildDefaultAIInterviewConfig,
  buildEmptyAIInterview,
  clearAIInterview,
  hasInterviewSessionEnded,
  getInterviewPanelType,
  isAIInterview
};
