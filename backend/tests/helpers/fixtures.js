"use strict";

/**
 * Test fixture helpers — create users, jobs, applications, and tokens
 * for use in integration tests.
 *
 * All fixtures use the real Mongoose models against the in-memory DB.
 * Passwords are hashed with bcrypt cost factor 4 (fast for tests).
 */

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const User = require("../../models/User");
const Student = require("../../models/Student");
const Job = require("../../models/Job");
const Application = require("../../models/Application");
const InterviewerProfile = require("../../models/InterviewerProfile");
const College = require("../../models/College");
const Package = require("../../models/Package");
const Subscription = require("../../models/Subscription");
const Payment = require("../../models/Payment");

const JWT_SECRET = process.env.JWT_SECRET || "talentx-test-secret-do-not-use-in-production";
const BCRYPT_ROUNDS = 4; // fast for tests

// ── Token helpers ─────────────────────────────────────────────────────────────

function makeToken(userId, role) {
  return jwt.sign({ id: String(userId), role }, JWT_SECRET, { expiresIn: "1d" });
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

// ── User factories ────────────────────────────────────────────────────────────

async function createUser(overrides = {}) {
  const defaults = {
    name: "Test User",
    email: `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
    password: await bcrypt.hash("Password1!", BCRYPT_ROUNDS),
    role: "student",
    isActive: true
  };
  return User.create({ ...defaults, ...overrides });
}

async function createStudent(userOverrides = {}, studentOverrides = {}) {
  const user = await createUser({ role: "student", ...userOverrides });
  const student = await Student.create({
    userId: user._id,
    studentType: "open_student",
    collegeVerificationStatus: "not_required",
    isCollegeVerified: false,
    accessLevel: "limited",
    branch: "CS",
    year: "3",
    cgpa: 8.0,
    ...studentOverrides
  });
  const token = makeToken(user._id, "student");
  return { user, student, token };
}

async function createCollegeStudent(college, userOverrides = {}, studentOverrides = {}) {
  const user = await createUser({
    role: "student",
    email: `student-${Date.now()}@${college.domain}`,
    collegeId: college._id,
    ...userOverrides
  });
  const student = await Student.create({
    userId: user._id,
    studentType: "college_student",
    collegeId: college._id,
    collegeName: college.name,
    collegeVerificationStatus: "approved",
    isCollegeVerified: true,
    accessLevel: "full",
    branch: "CS",
    year: "3",
    cgpa: 8.0,
    ...studentOverrides
  });
  const token = makeToken(user._id, "student");
  return { user, student, token };
}

async function createRecruiter(overrides = {}) {
  const user = await createUser({
    role: "recruiter",
    name: "Test Recruiter",
    companyName: "TestCorp",
    companyEmail: `recruiter-${Date.now()}@testcorp.com`,
    companyWebsite: "https://testcorp.com",
    recruiterApprovalStatus: "approved",
    ...overrides
  });
  const token = makeToken(user._id, "recruiter");
  return { user, token };
}

async function createSuperAdmin(overrides = {}) {
  const user = await createUser({
    role: "super_admin",
    name: "Super Admin",
    ...overrides
  });
  const token = makeToken(user._id, "super_admin");
  return { user, token };
}

async function createCollegeAdmin(college, overrides = {}) {
  const user = await createUser({
    role: "college_admin",
    name: "College Admin",
    collegeId: college._id,
    ...overrides
  });
  const token = makeToken(user._id, "college_admin");
  return { user, token };
}

async function createInterviewer(recruiterId, overrides = {}) {
  const user = await createUser({
    role: "interviewer",
    name: "Test Interviewer",
    mustChangePassword: false,
    ...overrides
  });
  const profile = await InterviewerProfile.create({
    userId: user._id,
    recruiterId,
    interviewerCode: `INT-${Date.now()}`,
    isActive: true,
    expertise: ["JavaScript"]
  });
  const token = makeToken(user._id, "interviewer");
  return { user, profile, token };
}

// ── College factory ───────────────────────────────────────────────────────────

async function createCollege(overrides = {}) {
  return College.create({
    name: "Test University",
    domain: `testuniv-${Date.now()}.edu`,
    status: "active",
    enterprisePlanActive: true,
    ...overrides
  });
}

// ── Job factory ───────────────────────────────────────────────────────────────

async function createJob(recruiterId, overrides = {}) {
  return Job.create({
    recruiterId,
    companyName: "TestCorp",
    title: "Software Engineer",
    description: "Test job",
    ctc: 600000,
    aboutCompany: "A test company",
    minCgpa: 6.0,
    eligibleBranches: ["CS", "IT"],
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    isActive: true,
    visibilityType: "all_students",
    ...overrides
  });
}

// ── Application factory ───────────────────────────────────────────────────────

async function createApplication(studentId, jobId, overrides = {}) {
  return Application.create({
    studentId,
    jobId,
    resumeUrl: "/uploads/test-resume.pdf",
    status: "APPLIED",
    ...overrides
  });
}

// ── Package + Subscription factories ─────────────────────────────────────────

async function createRecruiterPackage(overrides = {}) {
  return Package.create({
    name: "Recruiter Starter Test",
    key: `recruiter_starter_test_${Date.now()}`,
    roleTarget: "recruiter",
    priceInPaise: 99900,
    billingCycle: "monthly",
    isActive: true,
    entitlements: {
      jobCreationLimit: 5,
      interviewSchedulingLimit: 10,
      offerLetterGenerationLimit: 5,
      onboardingPanelAccessLimit: 5,
      jobPosting: true,
      basicApplicantTracking: true,
      interviewScheduling: true,
      offerGeneration: true,
      assessmentPanel: true,
      humanInterviewPanel: true
    },
    ...overrides
  });
}

async function createSubscription(userId, packageDoc, overrides = {}) {
  return Subscription.create({
    userId,
    owner: userId,
    packageId: packageDoc._id,
    package: packageDoc._id,
    roleTarget: packageDoc.roleTarget,
    status: "active",
    source: "manual",
    planKey: packageDoc.key,
    plan: packageDoc.key,
    ownerRole: packageDoc.roleTarget,
    paymentProvider: "manual",
    startsAt: new Date(),
    endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    ...overrides
  });
}

// ── Payment factory ───────────────────────────────────────────────────────────

async function createPayment(userId, packageDoc, overrides = {}) {
  return Payment.create({
    user: userId,
    userRole: "recruiter",
    role: "recruiter",
    package: packageDoc._id,
    planKey: packageDoc.key,
    plan: packageDoc.key,
    amount: packageDoc.priceInPaise,
    currency: "INR",
    provider: "razorpay",
    paymentProvider: "razorpay",
    razorpayOrderId: `order_test_${Date.now()}`,
    status: "created",
    ...overrides
  });
}

module.exports = {
  makeToken,
  authHeader,
  createUser,
  createStudent,
  createCollegeStudent,
  createRecruiter,
  createSuperAdmin,
  createCollegeAdmin,
  createInterviewer,
  createCollege,
  createJob,
  createApplication,
  createRecruiterPackage,
  createSubscription,
  createPayment
};
