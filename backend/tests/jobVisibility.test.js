"use strict";

/**
 * Job visibility tests
 * - college_only job is blocked for a student from the wrong college
 * - college_only job is visible to a student from the correct college
 * - all_students job is visible to an open student
 */

jest.mock("../services/realtimeService", () => require("./__mocks__/realtimeService"));

const { canStudentViewJob } = require("../helpers/jobVisibilityHelper");
const { connectTestDb, disconnectTestDb, clearTestDb } = require("./helpers/testDb");
const { createCollege, createCollegeStudent, createStudent, createJob, createRecruiter } = require("./helpers/fixtures");

// These tests exercise the helper directly (unit) and via the API (integration)
beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(disconnectTestDb);

describe("canStudentViewJob — unit tests", () => {
  it("all_students job is visible to open student", () => {
    const student = { studentType: "open_student", collegeId: null };
    const job = { visibilityType: "all_students", targetColleges: [] };
    expect(canStudentViewJob(student, job, { hasFullAccess: false })).toBe(true);
  });

  it("college_only job is NOT visible to open student", () => {
    const collegeId = "507f1f77bcf86cd799439011";
    const student = { studentType: "open_student", collegeId: null };
    const job = {
      visibilityType: "college_only",
      targetColleges: [{ _id: collegeId, toString: () => collegeId }]
    };
    expect(canStudentViewJob(student, job, { hasFullAccess: false })).toBe(false);
  });

  it("college_only job is visible to verified student from the target college", () => {
    const collegeId = "507f1f77bcf86cd799439011";
    const student = {
      studentType: "college_student",
      collegeId: { _id: collegeId, toString: () => collegeId },
      collegeVerificationStatus: "approved",
      isCollegeVerified: true,
      accessLevel: "full"
    };
    const job = {
      visibilityType: "college_only",
      targetColleges: [{ _id: collegeId, toString: () => collegeId }]
    };
    expect(canStudentViewJob(student, job, { hasFullAccess: true })).toBe(true);
  });

  it("college_only job is NOT visible to verified student from a different college", () => {
    const targetCollegeId = "507f1f77bcf86cd799439011";
    const studentCollegeId = "507f1f77bcf86cd799439022";
    const student = {
      studentType: "college_student",
      collegeId: { _id: studentCollegeId, toString: () => studentCollegeId },
      collegeVerificationStatus: "approved",
      isCollegeVerified: true,
      accessLevel: "full"
    };
    const job = {
      visibilityType: "college_only",
      targetColleges: [{ _id: targetCollegeId, toString: () => targetCollegeId }]
    };
    expect(canStudentViewJob(student, job, { hasFullAccess: true })).toBe(false);
  });

  it("college_plus_off_campus job is visible to open student", () => {
    const student = { studentType: "open_student", collegeId: null };
    const job = { visibilityType: "college_plus_off_campus", targetColleges: [] };
    expect(canStudentViewJob(student, job, { hasFullAccess: false })).toBe(true);
  });

  it("returns false when student or job is null", () => {
    expect(canStudentViewJob(null, {}, {})).toBe(false);
    expect(canStudentViewJob({}, null, {})).toBe(false);
  });
});

describe("GET /api/jobs/student — integration", () => {
  it("open student sees all_students job", async () => {
    const request = require("supertest");
    const { buildApp } = require("../app");
    const appInstance = buildApp();

    const { token } = await createStudent();
    const { user: recruiter } = await createRecruiter();
    await createJob(recruiter._id, { visibilityType: "all_students" });

    const res = await request(appInstance)
      .get("/api/student/jobs")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.jobs.length).toBeGreaterThanOrEqual(1);
  });

  it("open student does not see college_only job", async () => {
    const request = require("supertest");
    const { buildApp } = require("../app");
    const appInstance = buildApp();

    const { token } = await createStudent();
    const { user: recruiter } = await createRecruiter();
    const college = await createCollege();
    await createJob(recruiter._id, {
      visibilityType: "college_only",
      targetColleges: [college._id]
    });

    const res = await request(appInstance)
      .get("/api/student/jobs")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    // The college_only job should not appear for an open student
    const jobTitles = res.body.jobs.map((j) => j.visibilityType);
    expect(jobTitles.every((v) => v !== "college_only")).toBe(true);
  });
});
