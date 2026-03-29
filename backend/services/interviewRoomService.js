const mongoose = require("mongoose");
const Application = require("../models/Application");
const { buildInterviewAccess, isOnlineInterview } = require("../utils/interviewAccess");

function getInterviewRoomName(applicationId) {
  return `interview:${applicationId}`;
}

function getAssignedInterviewerUserId(app) {
  return String(
    app?.interviewerAssignment?.interviewerUserId?._id ||
      app?.interviewerAssignment?.interviewerUserId ||
      ""
  );
}

function getStudentUserId(app) {
  return String(app?.studentId?.userId?._id || app?.studentId?.userId || "");
}

function buildWindowErrorMessage(access) {
  const start = access?.accessWindowStart ? new Date(access.accessWindowStart) : null;
  const end = access?.accessWindowEnd ? new Date(access.accessWindowEnd) : null;

  if (start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
    return `Room access is available only between ${start.toISOString()} and ${end.toISOString()}`;
  }

  return "Room access is currently unavailable";
}

async function loadInterviewApplication(applicationId) {
  const normalizedId = String(applicationId || "").trim();
  if (!mongoose.Types.ObjectId.isValid(normalizedId)) {
    return null;
  }

  return Application.findById(normalizedId)
    .populate("jobId", "title companyName recruiterId")
    .populate({
      path: "studentId",
      select: "userId branch cgpa year",
      populate: { path: "userId", select: "name email" }
    })
    .populate("interviewerAssignment.interviewerUserId", "name email")
    .select(
      "jobId studentId interview status interviewerAssignment interviewerFeedback createdAt updatedAt"
    );
}

async function validateInterviewRoomAccess({ applicationId, userId, role }) {
  const normalizedUserId = String(userId || "").trim();
  const normalizedRole = String(role || "").trim().toLowerCase();
  const app = await loadInterviewApplication(applicationId);

  if (!app) {
    return {
      ok: false,
      statusCode: 404,
      message: "Interview not found"
    };
  }

  if (app.status !== "INTERVIEW_SCHEDULED" || !app.interview?.date) {
    return {
      ok: false,
      statusCode: 400,
      message: "Interview is not currently scheduled"
    };
  }

  if (!isOnlineInterview(app.interview)) {
    return {
      ok: false,
      statusCode: 400,
      message: "This interview is not configured for the virtual panel"
    };
  }

  const access = buildInterviewAccess(app.interview);
  if (!access.canJoin) {
    return {
      ok: false,
      statusCode: 403,
      message: buildWindowErrorMessage(access),
      application: app,
      access
    };
  }

  if (normalizedRole === "student") {
    const studentUserId = getStudentUserId(app);
    if (!studentUserId || studentUserId !== normalizedUserId) {
      return {
        ok: false,
        statusCode: 403,
        message: "You are not authorized to join this interview room"
      };
    }

    return {
      ok: true,
      statusCode: 200,
      message: "Access granted",
      application: app,
      access,
      roomName: getInterviewRoomName(String(app._id)),
      participantRole: "student",
      participantName: app?.studentId?.userId?.name || "Candidate"
    };
  }

  if (normalizedRole === "interviewer") {
    const assignedInterviewerUserId = getAssignedInterviewerUserId(app);
    if (!assignedInterviewerUserId) {
      return {
        ok: false,
        statusCode: 400,
        message: "No interviewer is assigned to this interview yet"
      };
    }

    if (assignedInterviewerUserId !== normalizedUserId) {
      return {
        ok: false,
        statusCode: 403,
        message: "You are not assigned to this interview"
      };
    }

    return {
      ok: true,
      statusCode: 200,
      message: "Access granted",
      application: app,
      access,
      roomName: getInterviewRoomName(String(app._id)),
      participantRole: "interviewer",
      participantName: app?.interviewerAssignment?.interviewerUserId?.name || "Interviewer"
    };
  }

  return {
    ok: false,
    statusCode: 403,
    message: "Unsupported role for interview room access"
  };
}

module.exports = {
  getInterviewRoomName,
  loadInterviewApplication,
  validateInterviewRoomAccess
};
