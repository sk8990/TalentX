"use strict";

jest.mock("../services/realtimeService", () => require("./__mocks__/realtimeService"));

const fs = require("fs");
const path = require("path");
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
const UPLOADS_DIR = path.resolve(__dirname, "../uploads");
let testFileName;
let testFilePath;

beforeAll(async () => {
  await connectTestDb();
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
});

beforeEach(() => {
  testFileName = `resume_test_${Date.now()}_${Math.random().toString(36).slice(2)}.pdf`;
  testFilePath = path.join(UPLOADS_DIR, testFileName);
  fs.writeFileSync(testFilePath, "%PDF-1.4\n% TalentX test resume\n%%EOF");
});

afterEach(async () => {
  if (testFilePath && fs.existsSync(testFilePath)) {
    fs.unlinkSync(testFilePath);
  }
  await clearTestDb();
});

afterAll(disconnectTestDb);

describe("protected root upload downloads", () => {
  it("allows the owning student to download their resume", async () => {
    const { student, token } = await createStudent();
    student.resumeUrl = `/uploads/${testFileName}`;
    await student.save();

    const res = await request(app)
      .get(`/api/files/root/${testFileName}`)
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/pdf/i);
  });

  it("blocks another student from downloading someone else's resume", async () => {
    const { student } = await createStudent();
    student.resumeUrl = `/uploads/${testFileName}`;
    await student.save();
    const { token: otherStudentToken } = await createStudent({
      email: `other-student-${Date.now()}@example.com`
    });

    const res = await request(app)
      .get(`/api/files/root/${testFileName}`)
      .set(authHeader(otherStudentToken));

    expect(res.status).toBe(403);
  });

  it("allows the owning recruiter to download an application resume", async () => {
    const { student } = await createStudent();
    const { user: recruiter, token: recruiterToken } = await createRecruiter();
    const job = await createJob(recruiter._id);
    await createApplication(student._id, job._id, {
      resumeUrl: `/uploads/${testFileName}`
    });

    const res = await request(app)
      .get(`/api/files/root/${testFileName}`)
      .set(authHeader(recruiterToken));

    expect(res.status).toBe(200);
  });

  it("blocks a different recruiter from downloading an application resume", async () => {
    const { student } = await createStudent();
    const { user: recruiter } = await createRecruiter();
    const { token: otherRecruiterToken } = await createRecruiter({
      email: `other-recruiter-${Date.now()}@testcorp.com`
    });
    const job = await createJob(recruiter._id);
    await createApplication(student._id, job._id, {
      resumeUrl: `/uploads/${testFileName}`
    });

    const res = await request(app)
      .get(`/api/files/root/${testFileName}`)
      .set(authHeader(otherRecruiterToken));

    expect(res.status).toBe(403);
  });
});
