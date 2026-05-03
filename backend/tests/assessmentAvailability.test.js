"use strict";

jest.mock("../services/realtimeService", () => require("./__mocks__/realtimeService"));

const request = require("supertest");
const { buildApp } = require("../app");
const { connectTestDb, disconnectTestDb, clearTestDb } = require("./helpers/testDb");
const {
  createStudent,
  createRecruiter,
  createJob,
  createApplication,
  authHeader
} = require("./helpers/fixtures");

const app = buildApp();

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(disconnectTestDb);

async function createAssessmentApplication(scheduledAt) {
  const { student, token: studentToken } = await createStudent();
  const { user: recruiter } = await createRecruiter();
  const job = await createJob(recruiter._id);
  const application = await createApplication(student._id, job._id, {
    status: "ASSESSMENT_SENT",
    assessment: {
      link: "https://assessment.example.com/start",
      sentAt: new Date(),
      scheduledAt
    }
  });

  return { application, studentToken };
}

describe("Assessment availability", () => {
  it("blocks assessment start before scheduled time", async () => {
    const future = new Date(Date.now() + 60 * 60 * 1000);
    const { application, studentToken } = await createAssessmentApplication(future);

    const res = await request(app)
      .post(`/api/application/${application._id}/assessment/start`)
      .set(authHeader(studentToken));

    expect(res.status).toBe(403);
    expect(res.body.message).toBe("Assessment is not available yet.");
  });

  it("allows assessment start after scheduled time", async () => {
    const past = new Date(Date.now() - 60 * 1000);
    const { application, studentToken } = await createAssessmentApplication(past);

    const res = await request(app)
      .post(`/api/application/${application._id}/assessment/start`)
      .set(authHeader(studentToken));

    expect(res.status).toBe(200);
    expect(res.body.assessmentLink).toBe("https://assessment.example.com/start");
  });
});
