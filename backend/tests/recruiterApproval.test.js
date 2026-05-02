"use strict";

/**
 * Recruiter approval tests
 * - pending recruiter cannot post a job
 * - super_admin can approve a recruiter
 * - college_admin cannot approve a recruiter (403)
 */

jest.mock("../services/realtimeService", () => require("./__mocks__/realtimeService"));

const request = require("supertest");
const { buildApp } = require("../app");
const { connectTestDb, disconnectTestDb, clearTestDb } = require("./helpers/testDb");
const {
  createRecruiter,
  createSuperAdmin,
  createCollegeAdmin,
  createCollege,
  createRecruiterPackage,
  createSubscription,
  authHeader
} = require("./helpers/fixtures");

const app = buildApp();

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(disconnectTestDb);

describe("Pending recruiter cannot post a job", () => {
  it("returns 403 when recruiterApprovalStatus is pending", async () => {
    const { token } = await createRecruiter({ recruiterApprovalStatus: "pending" });

    const res = await request(app)
      .post("/api/company/job")
      .set(authHeader(token))
      .send({
        title: "Engineer",
        companyName: "TestCorp",
        description: "Test",
        ctc: 600000,
        aboutCompany: "A company",
        minCgpa: 6,
        deadline: new Date(Date.now() + 86400000).toISOString()
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/pending approval/i);
  });

  it("returns 403 when recruiterApprovalStatus is null (legacy)", async () => {
    const { user, token } = await createRecruiter({ recruiterApprovalStatus: "pending" });
    // Simulate legacy null status by direct DB update
    const User = require("../models/User");
    await User.updateOne({ _id: user._id }, { $unset: { recruiterApprovalStatus: "" } });

    const res = await request(app)
      .post("/api/company/job")
      .set(authHeader(token))
      .send({
        title: "Engineer",
        companyName: "TestCorp",
        description: "Test",
        ctc: 600000,
        aboutCompany: "A company",
        minCgpa: 6,
        deadline: new Date(Date.now() + 86400000).toISOString()
      });

    expect(res.status).toBe(403);
  });
});

describe("Super Admin can approve a recruiter", () => {
  it("sets recruiterApprovalStatus to approved", async () => {
    const { user: recruiter } = await createRecruiter({ recruiterApprovalStatus: "pending" });
    const { token: superAdminToken } = await createSuperAdmin();

    const res = await request(app)
      .post(`/api/super-admin/recruiters/${recruiter._id}/approve`)
      .set(authHeader(superAdminToken));

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/approved/i);

    // Verify DB state
    const User = require("../models/User");
    const updated = await User.findById(recruiter._id);
    expect(updated.recruiterApprovalStatus).toBe("approved");
  });

  it("returns 400 when recruiter is already approved", async () => {
    const { user: recruiter } = await createRecruiter({ recruiterApprovalStatus: "approved" });
    const { token: superAdminToken } = await createSuperAdmin();

    const res = await request(app)
      .post(`/api/super-admin/recruiters/${recruiter._id}/approve`)
      .set(authHeader(superAdminToken));

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already approved/i);
  });
});

describe("College Admin cannot approve a recruiter", () => {
  it("returns 403 when college_admin tries to approve", async () => {
    const college = await createCollege();
    const { user: recruiter } = await createRecruiter({ recruiterApprovalStatus: "pending" });
    const { token: collegeAdminToken } = await createCollegeAdmin(college);

    const res = await request(app)
      .post(`/api/super-admin/recruiters/${recruiter._id}/approve`)
      .set(authHeader(collegeAdminToken));

    expect(res.status).toBe(403);
  });

  it("returns 403 when recruiter tries to approve another recruiter", async () => {
    const { user: recruiter1 } = await createRecruiter({ recruiterApprovalStatus: "pending" });
    const { token: recruiter2Token } = await createRecruiter({ recruiterApprovalStatus: "approved" });

    const res = await request(app)
      .post(`/api/super-admin/recruiters/${recruiter1._id}/approve`)
      .set(authHeader(recruiter2Token));

    expect(res.status).toBe(403);
  });
});

describe("Approved recruiter can post a job (with active subscription)", () => {
  it("returns 201 when recruiter is approved and has a valid plan", async () => {
    const { user: recruiter, token } = await createRecruiter({ recruiterApprovalStatus: "approved" });
    const pkg = await createRecruiterPackage();
    await createSubscription(recruiter._id, pkg);

    const res = await request(app)
      .post("/api/company/job")
      .set(authHeader(token))
      .send({
        title: "Software Engineer",
        companyName: "TestCorp",
        description: "A great role",
        ctc: 600000,
        aboutCompany: "We build things",
        minCgpa: 6,
        eligibleBranches: ["CS"],
        deadline: new Date(Date.now() + 30 * 86400000).toISOString(),
        targetColleges: [],
        visibleToOffCampus: true
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("_id");
    expect(res.body.title).toBe("Software Engineer");
  });
});
