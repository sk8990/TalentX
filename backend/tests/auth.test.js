"use strict";

/**
 * Auth tests
 * - login success
 * - wrong password returns 401
 * - protected route without token returns 401
 */

jest.mock("../services/realtimeService", () => require("./__mocks__/realtimeService"));

const request = require("supertest");
const bcrypt = require("bcryptjs");
const { buildApp } = require("../app");
const { connectTestDb, disconnectTestDb, clearTestDb } = require("./helpers/testDb");
const { createUser } = require("./helpers/fixtures");

const app = buildApp();

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(disconnectTestDb);

describe("POST /api/auth/login", () => {
  it("returns 200 and a JWT token on valid credentials", async () => {
    await createUser({
      email: "student@example.com",
      password: await bcrypt.hash("Password1!", 4),
      role: "student"
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "student@example.com", password: "Password1!" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(typeof res.body.token).toBe("string");
    expect(res.body.user.email).toBe("student@example.com");
    expect(res.body.user.role).toBe("student");
    // Password must never be returned
    expect(res.body.user.password).toBeUndefined();
  });

  it("returns 401 on wrong password", async () => {
    await createUser({
      email: "student2@example.com",
      password: await bcrypt.hash("Password1!", 4),
      role: "student"
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "student2@example.com", password: "WrongPassword1!" });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("message");
  });

  it("returns 401 for non-existent email", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "Password1!" });

    expect(res.status).toBe(401);
  });

  it("returns 403 for disabled account", async () => {
    await createUser({
      email: "disabled@example.com",
      password: await bcrypt.hash("Password1!", 4),
      role: "student",
      isActive: false,
      disabledReason: "Suspended by admin"
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "disabled@example.com", password: "Password1!" });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/disabled/i);
  });
});

describe("POST /api/auth/register", () => {
  it("creates an open student even when email driver is not configured", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Open Student",
        email: "open-student@example.com",
        password: "StrongerPass123!",
        role: "student",
        studentType: "open_student"
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/Open Student/i);
  });
});

describe("Protected route — no token", () => {
  it("returns 401 when Authorization header is missing", async () => {
    const res = await request(app).get("/api/student/profile");
    expect(res.status).toBe(401);
  });

  it("returns 401 when token is malformed", async () => {
    const res = await request(app)
      .get("/api/student/profile")
      .set("Authorization", "Bearer not-a-real-token");
    expect(res.status).toBe(401);
  });
});
