"use strict";

jest.mock("../services/realtimeService", () => require("./__mocks__/realtimeService"));

const request = require("supertest");
const { buildApp } = require("../app");
const { connectTestDb, disconnectTestDb, clearTestDb } = require("./helpers/testDb");
const {
  createRecruiter,
  createRecruiterPackage,
  createSubscription,
  authHeader
} = require("./helpers/fixtures");
const PackageUsage = require("../models/PackageUsage");

const app = buildApp();

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(disconnectTestDb);

function jobPayload(title = "Software Engineer") {
  return {
    title,
    companyName: "TestCorp",
    description: "A demo role",
    ctc: 600000,
    aboutCompany: "We build useful things",
    minCgpa: 6,
    eligibleBranches: ["CS"],
    deadline: new Date(Date.now() + 30 * 86400000).toISOString(),
    targetColleges: [],
    visibleToOffCampus: true
  };
}

describe("package quota behavior", () => {
  it("enforces active job creation limit and increments usage once per created job", async () => {
    const { user: recruiter, token } = await createRecruiter({ recruiterApprovalStatus: "approved" });
    const pkg = await createRecruiterPackage({
      entitlements: {
        jobCreationLimit: 1,
        interviewSchedulingLimit: 10,
        offerLetterGenerationLimit: 5,
        onboardingPanelAccessLimit: 5,
        jobPosting: true,
        basicApplicantTracking: true
      }
    });
    await createSubscription(recruiter._id, pkg);

    const first = await request(app)
      .post("/api/company/job")
      .set(authHeader(token))
      .send(jobPayload("First Role"));

    const second = await request(app)
      .post("/api/company/job")
      .set(authHeader(token))
      .send(jobPayload("Second Role"));

    expect(first.status).toBe(201);
    expect(second.status).toBe(403);
    expect(second.body.code).toBe("PACKAGE_QUOTA_EXHAUSTED");

    const usageRows = await PackageUsage.find({ userId: recruiter._id, usageType: "job_creation" });
    expect(usageRows).toHaveLength(1);
    expect(usageRows[0].usedCount).toBe(1);
  });

  it("treats only -1 as unlimited", async () => {
    const { user: recruiter, token } = await createRecruiter({ recruiterApprovalStatus: "approved" });
    const pkg = await createRecruiterPackage({
      entitlements: {
        jobCreationLimit: -1,
        interviewSchedulingLimit: 10,
        offerLetterGenerationLimit: 5,
        onboardingPanelAccessLimit: 5,
        jobPosting: true,
        basicApplicantTracking: true
      }
    });
    await createSubscription(recruiter._id, pkg);

    const first = await request(app)
      .post("/api/company/job")
      .set(authHeader(token))
      .send(jobPayload("Unlimited Role A"));
    const second = await request(app)
      .post("/api/company/job")
      .set(authHeader(token))
      .send(jobPayload("Unlimited Role B"));

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(await PackageUsage.countDocuments({ userId: recruiter._id, usageType: "job_creation" })).toBe(0);
  });

  it("does not treat malformed limits as unlimited", async () => {
    const { user: recruiter, token } = await createRecruiter({ recruiterApprovalStatus: "approved" });
    const pkg = await createRecruiterPackage({
      entitlements: {
        jobCreationLimit: "not-a-number",
        jobPosting: true,
        basicApplicantTracking: true
      }
    });
    await createSubscription(recruiter._id, pkg);

    const res = await request(app)
      .post("/api/company/job")
      .set(authHeader(token))
      .send(jobPayload("Malformed Limit Role"));

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/active recruiter plan/i);
  });
});
