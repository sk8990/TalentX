"use strict";

/**
 * Interview scheduling tests
 * - HUMAN interview can be scheduled (panelType: HUMAN)
 * - AI interview defaults when panelType is omitted
 * - AI interview rejects Offline mode
 * - HUMAN Online interview requires a meeting link
 * - Interviewer can be assigned to a HUMAN interview
 * - Interviewer cannot be assigned to an AI interview
 */

jest.mock("../services/realtimeService", () => require("./__mocks__/realtimeService"));

const request = require("supertest");
const { buildApp } = require("../app");
const { connectTestDb, disconnectTestDb, clearTestDb } = require("./helpers/testDb");
const {
  createStudent,
  createRecruiter,
  createJob,
  createApplication,
  createInterviewer,
  createRecruiterPackage,
  createSubscription,
  authHeader
} = require("./helpers/fixtures");

const app = buildApp();

const FUTURE_DATE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
const FUTURE_END  = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString();

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(disconnectTestDb);

async function setupApprovedRecruiterWithApp() {
  const { student, token: studentToken } = await createStudent();
  const { user: recruiter, token: recruiterToken } = await createRecruiter({
    recruiterApprovalStatus: "approved"
  });
  const pkg = await createRecruiterPackage();
  await createSubscription(recruiter._id, pkg);
  const job = await createJob(recruiter._id);
  const application = await createApplication(student._id, job._id, {
    status: "ASSESSMENT_PASSED"
  });
  return { student, studentToken, recruiter, recruiterToken, job, application };
}

describe("Schedule interview — panelType handling", () => {
  it("defaults to AI when panelType is not sent", async () => {
    const { application, recruiterToken } = await setupApprovedRecruiterWithApp();

    const res = await request(app)
      .put(`/api/application/${application._id}/interview`)
      .set(authHeader(recruiterToken))
      .send({ date: FUTURE_DATE, endDate: FUTURE_END, mode: "Online" });

    expect(res.status).toBe(200);
    expect(res.body.interview.panelType).toBe("AI");
  });

  it("schedules HUMAN interview Online with a meeting link", async () => {
    const { application, recruiterToken } = await setupApprovedRecruiterWithApp();

    const res = await request(app)
      .put(`/api/application/${application._id}/interview`)
      .set(authHeader(recruiterToken))
      .send({
        date: FUTURE_DATE,
        endDate: FUTURE_END,
        mode: "Online",
        panelType: "HUMAN",
        link: "https://meet.google.com/abc-defg-hij"
      });

    expect(res.status).toBe(200);
    expect(res.body.interview.panelType).toBe("HUMAN");
    expect(res.body.interview.link).toBe("https://meet.google.com/abc-defg-hij");
    expect(res.body.status).toBe("INTERVIEW_SCHEDULED");
  });

  it("schedules HUMAN interview Offline without a link", async () => {
    const { application, recruiterToken } = await setupApprovedRecruiterWithApp();

    const res = await request(app)
      .put(`/api/application/${application._id}/interview`)
      .set(authHeader(recruiterToken))
      .send({
        date: FUTURE_DATE,
        endDate: FUTURE_END,
        mode: "Offline",
        panelType: "HUMAN"
      });

    expect(res.status).toBe(200);
    expect(res.body.interview.panelType).toBe("HUMAN");
    expect(res.body.interview.mode).toBe("Offline");
  });

  it("rejects AI interview with Offline mode", async () => {
    const { application, recruiterToken } = await setupApprovedRecruiterWithApp();

    const res = await request(app)
      .put(`/api/application/${application._id}/interview`)
      .set(authHeader(recruiterToken))
      .send({
        date: FUTURE_DATE,
        endDate: FUTURE_END,
        mode: "Offline",
        panelType: "AI"
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/AI interviews must use Online mode/i);
  });

  it("rejects HUMAN Online interview without a meeting link", async () => {
    const { application, recruiterToken } = await setupApprovedRecruiterWithApp();

    const res = await request(app)
      .put(`/api/application/${application._id}/interview`)
      .set(authHeader(recruiterToken))
      .send({
        date: FUTURE_DATE,
        endDate: FUTURE_END,
        mode: "Online",
        panelType: "HUMAN"
        // no link
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/meeting link is required/i);
  });
});

describe("Interviewer assignment", () => {
  it("succeeds for a HUMAN interview", async () => {
    const { application, recruiter, recruiterToken } = await setupApprovedRecruiterWithApp();

    // Schedule a HUMAN interview first
    await request(app)
      .put(`/api/application/${application._id}/interview`)
      .set(authHeader(recruiterToken))
      .send({
        date: FUTURE_DATE,
        endDate: FUTURE_END,
        mode: "Online",
        panelType: "HUMAN",
        link: "https://meet.google.com/test"
      });

    const { user: interviewerUser } = await createInterviewer(recruiter._id);

    const res = await request(app)
      .put(`/api/application/${application._id}/interviewer/assign`)
      .set(authHeader(recruiterToken))
      .send({ interviewerUserId: interviewerUser._id.toString() });

    expect(res.status).toBe(200);
    expect(res.body.interviewerAssignment.interviewerUserId).toBeTruthy();
  });

  it("returns 400 when trying to assign interviewer to an AI interview", async () => {
    const { application, recruiter, recruiterToken } = await setupApprovedRecruiterWithApp();

    // Schedule an AI interview
    await request(app)
      .put(`/api/application/${application._id}/interview`)
      .set(authHeader(recruiterToken))
      .send({
        date: FUTURE_DATE,
        endDate: FUTURE_END,
        mode: "Online",
        panelType: "AI"
      });

    const { user: interviewerUser } = await createInterviewer(recruiter._id);

    const res = await request(app)
      .put(`/api/application/${application._id}/interviewer/assign`)
      .set(authHeader(recruiterToken))
      .send({ interviewerUserId: interviewerUser._id.toString() });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/AI interviews do not require interviewer assignment/i);
  });

  it("returns 403 when a different recruiter tries to assign", async () => {
    const { application, recruiterToken: recruiterAToken } = await setupApprovedRecruiterWithApp();

    // Schedule HUMAN interview as recruiter A
    await request(app)
      .put(`/api/application/${application._id}/interview`)
      .set(authHeader(recruiterAToken))
      .send({
        date: FUTURE_DATE,
        endDate: FUTURE_END,
        mode: "Online",
        panelType: "HUMAN",
        link: "https://meet.google.com/test"
      });

    // Recruiter B tries to assign
    const { token: recruiterBToken } = await createRecruiter({
      email: `recruiterb-${Date.now()}@testcorp.com`,
      recruiterApprovalStatus: "approved"
    });

    const res = await request(app)
      .put(`/api/application/${application._id}/interviewer/assign`)
      .set(authHeader(recruiterBToken))
      .send({ interviewerUserId: "000000000000000000000001" });

    expect(res.status).toBe(403);
  });
});

describe("Human interview room and feedback", () => {
  async function scheduleAndAssignHumanInterview() {
    const fixture = await setupApprovedRecruiterWithApp();
    const start = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const end = new Date(Date.now() + 35 * 60 * 1000).toISOString();

    await request(app)
      .put(`/api/application/${fixture.application._id}/interview`)
      .set(authHeader(fixture.recruiterToken))
      .send({
        date: start,
        endDate: end,
        mode: "Online",
        panelType: "HUMAN",
        link: "https://meet.google.com/shared-room"
      });

    const { user: interviewerUser, token: interviewerToken } = await createInterviewer(fixture.recruiter._id);

    await request(app)
      .put(`/api/application/${fixture.application._id}/interviewer/assign`)
      .set(authHeader(fixture.recruiterToken))
      .send({ interviewerUserId: interviewerUser._id.toString() });

    return { ...fixture, interviewerUser, interviewerToken };
  }

  it("returns the same roomId for the assigned student and interviewer", async () => {
    const { application, studentToken, interviewerToken } = await scheduleAndAssignHumanInterview();

    const studentRoom = await request(app)
      .get(`/api/application/${application._id}/interview/room`)
      .set(authHeader(studentToken));

    const interviewerRoom = await request(app)
      .get(`/api/interviewer/interviews/${application._id}/room`)
      .set(authHeader(interviewerToken));

    expect(studentRoom.status).toBe(200);
    expect(interviewerRoom.status).toBe(200);
    expect(studentRoom.body.roomId).toBe(interviewerRoom.body.roomId);
    expect(studentRoom.body.meetingLink).toBe("https://meet.google.com/shared-room");
  });

  it("blocks the wrong student and wrong interviewer from the room", async () => {
    const { application, recruiter } = await scheduleAndAssignHumanInterview();
    const { token: wrongStudentToken } = await createStudent({
      email: `wrong-student-${Date.now()}@example.com`
    });
    const { token: wrongInterviewerToken } = await createInterviewer(recruiter._id, {
      email: `wrong-interviewer-${Date.now()}@example.com`
    });

    const wrongStudent = await request(app)
      .get(`/api/application/${application._id}/interview/room`)
      .set(authHeader(wrongStudentToken));

    const wrongInterviewer = await request(app)
      .get(`/api/interviewer/interviews/${application._id}/room`)
      .set(authHeader(wrongInterviewerToken));

    expect(wrongStudent.status).toBe(403);
    expect(wrongInterviewer.status).toBe(403);
  });

  it("blocks interviewer routes until mustChangePassword is cleared", async () => {
    const { recruiter } = await setupApprovedRecruiterWithApp();
    const { token } = await createInterviewer(recruiter._id, {
      mustChangePassword: true
    });

    const res = await request(app)
      .get("/api/interviewer/interviews")
      .set(authHeader(token));

    expect(res.status).toBe(403);
    expect(res.body.mustChangePassword).toBe(true);
  });

  it("lets the assigned interviewer submit feedback and recruiter view it", async () => {
    const { application, interviewerToken, recruiterToken, job } = await scheduleAndAssignHumanInterview();

    const endRes = await request(app)
      .post(`/api/interviewer/interviews/${application._id}/end`)
      .set(authHeader(interviewerToken));
    expect(endRes.status).toBe(200);

    const feedbackRes = await request(app)
      .post(`/api/interviewer/interviews/${application._id}/feedback`)
      .set(authHeader(interviewerToken))
      .send({
        recommendation: "YES",
        ratings: {
          communication: "4",
          technical: "5",
          problemSolving: "4",
          cultureFit: "5"
        },
        notes: "Strong fit for the role."
      });

    expect(feedbackRes.status).toBe(200);
    expect(feedbackRes.body.recommendation).toBe("YES");

    const applicationsRes = await request(app)
      .get(`/api/application/job/${job._id}`)
      .set(authHeader(recruiterToken));

    expect(applicationsRes.status).toBe(200);
    const refreshed = applicationsRes.body.find((item) => item._id === String(application._id));
    expect(refreshed.interviewerFeedback.recommendation).toBe("YES");
    expect(refreshed.interviewerFeedback.notes).toBe("Strong fit for the role.");
  });
});
