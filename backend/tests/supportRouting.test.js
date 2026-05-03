"use strict";

jest.mock("../services/realtimeService", () => require("./__mocks__/realtimeService"));

const request = require("supertest");
const { buildApp } = require("../app");
const { connectTestDb, disconnectTestDb, clearTestDb } = require("./helpers/testDb");
const {
  createStudent,
  createCollege,
  createCollegeStudent,
  createCollegeAdmin,
  createRecruiter,
  createSuperAdmin,
  authHeader
} = require("./helpers/fixtures");

const app = buildApp();

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(disconnectTestDb);

describe("Support ticket routing", () => {
  it("routes approved college student tickets to that college admin only", async () => {
    const collegeA = await createCollege({ name: "College A", domain: `college-a-${Date.now()}.edu` });
    const collegeB = await createCollege({ name: "College B", domain: `college-b-${Date.now()}.edu` });
    const { token: studentToken } = await createCollegeStudent(collegeA);
    const { token: adminAToken } = await createCollegeAdmin(collegeA);
    const { token: adminBToken } = await createCollegeAdmin(collegeB);

    const createRes = await request(app)
      .post("/api/support/ticket")
      .set(authHeader(studentToken))
      .send({ question: "Placement drive date is wrong" });

    expect(createRes.status).toBe(201);
    expect(createRes.body.assignedToRole).toBe("college_admin");
    expect(String(createRes.body.assignedCollegeId)).toBe(String(collegeA._id));

    const adminARes = await request(app)
      .get("/api/support/college-admin")
      .set(authHeader(adminAToken));

    expect(adminARes.status).toBe(200);
    expect(adminARes.body.assignedTickets).toHaveLength(1);
    expect(adminARes.body.assignedTickets[0].question).toBe("Placement drive date is wrong");

    const adminBRes = await request(app)
      .get("/api/support/college-admin")
      .set(authHeader(adminBToken));

    expect(adminBRes.status).toBe(200);
    expect(adminBRes.body.assignedTickets).toHaveLength(0);
  });

  it("routes open student, recruiter, and college admin tickets to super admin", async () => {
    const { token: openStudentToken } = await createStudent();
    const { token: recruiterToken } = await createRecruiter();
    const college = await createCollege();
    const { token: collegeAdminToken } = await createCollegeAdmin(college);
    const { token: superAdminToken } = await createSuperAdmin();

    const openStudentTicket = await request(app)
      .post("/api/support/ticket")
      .set(authHeader(openStudentToken))
      .send({ question: "Open student issue" });
    const recruiterTicket = await request(app)
      .post("/api/support/recruiter/ticket")
      .set(authHeader(recruiterToken))
      .send({ question: "Recruiter issue" });
    const collegeAdminTicket = await request(app)
      .post("/api/support/college-admin/ticket")
      .set(authHeader(collegeAdminToken))
      .send({ question: "College admin issue" });

    expect(openStudentTicket.body.assignedToRole).toBe("super_admin");
    expect(recruiterTicket.body.assignedToRole).toBe("super_admin");
    expect(collegeAdminTicket.body.assignedToRole).toBe("super_admin");

    const superAdminRes = await request(app)
      .get("/api/support/admin")
      .set(authHeader(superAdminToken));

    expect(superAdminRes.status).toBe(200);
    const questions = superAdminRes.body.map((ticket) => ticket.question);
    expect(questions).toEqual(expect.arrayContaining([
      "Open student issue",
      "Recruiter issue",
      "College admin issue"
    ]));
  });

  it("prevents a college admin from responding to another college ticket", async () => {
    const collegeA = await createCollege({ name: "Scope A", domain: `scope-a-${Date.now()}.edu` });
    const collegeB = await createCollege({ name: "Scope B", domain: `scope-b-${Date.now()}.edu` });
    const { token: studentToken } = await createCollegeStudent(collegeA);
    const { token: adminAToken } = await createCollegeAdmin(collegeA);
    const { token: adminBToken } = await createCollegeAdmin(collegeB);

    const createRes = await request(app)
      .post("/api/support/ticket")
      .set(authHeader(studentToken))
      .send({ question: "College-scoped ticket" });

    const wrongAdminRes = await request(app)
      .put(`/api/support/college-admin/${createRes.body._id}/respond`)
      .set(authHeader(adminBToken))
      .send({ response: "Wrong college reply" });

    expect(wrongAdminRes.status).toBe(404);

    const rightAdminRes = await request(app)
      .put(`/api/support/college-admin/${createRes.body._id}/respond`)
      .set(authHeader(adminAToken))
      .send({ response: "Correct college reply" });

    expect(rightAdminRes.status).toBe(200);
    expect(rightAdminRes.body.adminResponse).toBe("Correct college reply");
  });
});
