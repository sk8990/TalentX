"use strict";

/**
 * Offer letter authorization tests
 * - student can download their own offer letter
 * - student cannot download another student's offer letter (404, not 403)
 * - recruiter can download offer for their own job
 * - recruiter cannot download offer for another recruiter's job
 */

jest.mock("../services/realtimeService", () => require("./__mocks__/realtimeService"));

const request = require("supertest");
const path = require("path");
const fs = require("fs");
const { buildApp } = require("../app");
const { connectTestDb, disconnectTestDb, clearTestDb } = require("./helpers/testDb");
const {
  createStudent,
  createCollege,
  createCollegeStudent,
  createRecruiter,
  createJob,
  createApplication,
  authHeader
} = require("./helpers/fixtures");

const app = buildApp();

// Create a real (tiny) PDF file in the offers directory so res.download works
const OFFERS_DIR = path.resolve(__dirname, "../offers");
let testPdfPath;
let testPdfName;

beforeAll(async () => {
  await connectTestDb();
  if (!fs.existsSync(OFFERS_DIR)) {
    fs.mkdirSync(OFFERS_DIR, { recursive: true });
  }
  testPdfName = `offer_test_${Date.now()}.pdf`;
  testPdfPath = path.join(OFFERS_DIR, testPdfName);
  // Minimal valid PDF bytes
  fs.writeFileSync(testPdfPath, "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF");
});

afterEach(clearTestDb);

afterAll(async () => {
  if (testPdfPath && fs.existsSync(testPdfPath)) {
    fs.unlinkSync(testPdfPath);
  }
  await disconnectTestDb();
});

describe("Offer letter download authorization", () => {
  it("returns 200 for the student who owns the application", async () => {
    const college = await createCollege();
    const { student, token } = await createCollegeStudent(college);
    const { user: recruiter } = await createRecruiter();
    const job = await createJob(recruiter._id);
    const app_ = await createApplication(student._id, job._id, {
      status: "SELECTED",
      offer: {
        salary: "6 LPA",
        joiningDate: new Date(),
        location: "Pune",
        generatedAt: new Date(),
        status: "PENDING",
        pdfPath: testPdfName
      }
    });

    const res = await request(app)
      .get(`/api/application/${app_._id}/offer/download`)
      .set(authHeader(token));

    // 200 with PDF content-type
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/pdf/i);
  });

  it("returns 404 for a different student (does not leak existence)", async () => {
    const { student: studentA } = await createStudent();
    const { token: tokenB } = await createStudent({
      email: `studentb-${Date.now()}@example.com`
    });
    const { user: recruiter } = await createRecruiter();
    const job = await createJob(recruiter._id);
    const app_ = await createApplication(studentA._id, job._id, {
      status: "SELECTED",
      offer: {
        salary: "6 LPA",
        joiningDate: new Date(),
        location: "Pune",
        generatedAt: new Date(),
        status: "PENDING",
        pdfPath: testPdfName
      }
    });

    const res = await request(app)
      .get(`/api/application/${app_._id}/offer/download`)
      .set(authHeader(tokenB));

    // Must be 404, not 403 — prevents confirming the application exists
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Offer letter not found");
  });

  it("returns 200 for the recruiter who owns the job", async () => {
    const { student } = await createStudent();
    const { user: recruiter, token: recruiterToken } = await createRecruiter();
    const job = await createJob(recruiter._id);
    const app_ = await createApplication(student._id, job._id, {
      status: "SELECTED",
      offer: {
        salary: "6 LPA",
        joiningDate: new Date(),
        location: "Pune",
        generatedAt: new Date(),
        status: "PENDING",
        pdfPath: testPdfName
      }
    });

    const res = await request(app)
      .get(`/api/application/${app_._id}/offer/download`)
      .set(authHeader(recruiterToken));

    expect(res.status).toBe(200);
  });

  it("returns 403 for a different recruiter", async () => {
    const { student } = await createStudent();
    const { user: recruiterA } = await createRecruiter();
    const { token: recruiterBToken } = await createRecruiter({
      email: `recruiterb-${Date.now()}@testcorp.com`
    });
    const job = await createJob(recruiterA._id);
    const app_ = await createApplication(student._id, job._id, {
      status: "SELECTED",
      offer: {
        salary: "6 LPA",
        joiningDate: new Date(),
        location: "Pune",
        generatedAt: new Date(),
        status: "PENDING",
        pdfPath: testPdfName
      }
    });

    const res = await request(app)
      .get(`/api/application/${app_._id}/offer/download`)
      .set(authHeader(recruiterBToken));

    expect(res.status).toBe(403);
  });

  it("returns 401 with no token", async () => {
    const res = await request(app)
      .get("/api/application/000000000000000000000001/offer/download");
    expect(res.status).toBe(401);
  });

  it("returns 404 when offer pdfPath is missing", async () => {
    const { student, token } = await createStudent();
    const { user: recruiter } = await createRecruiter();
    const job = await createJob(recruiter._id);
    const app_ = await createApplication(student._id, job._id, {
      status: "SELECTED"
      // no offer field
    });

    const res = await request(app)
      .get(`/api/application/${app_._id}/offer/download`)
      .set(authHeader(token));

    expect(res.status).toBe(404);
  });
});
