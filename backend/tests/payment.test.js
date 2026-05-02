"use strict";

/**
 * Payment verification tests
 * - invalid signature is rejected (400)
 * - duplicate verification is idempotent (200 with alreadyVerified: true)
 */

jest.mock("../services/realtimeService", () => require("./__mocks__/realtimeService"));

const request = require("supertest");
const crypto = require("crypto");
const { buildApp } = require("../app");
const { connectTestDb, disconnectTestDb, clearTestDb } = require("./helpers/testDb");
const {
  createRecruiter,
  createRecruiterPackage,
  createPayment,
  authHeader
} = require("./helpers/fixtures");
const Payment = require("../models/Payment");
const AuditLog = require("../models/AuditLog");

const app = buildApp();

// Use a deterministic test key so we can compute valid signatures
const TEST_RAZORPAY_KEY_ID = "rzp_test_testkey123456";
const TEST_RAZORPAY_KEY_SECRET = "test_secret_for_unit_tests_only";

beforeAll(async () => {
  await connectTestDb();
  process.env.RAZORPAY_KEY_ID = TEST_RAZORPAY_KEY_ID;
  process.env.RAZORPAY_KEY_SECRET = TEST_RAZORPAY_KEY_SECRET;
});
afterEach(clearTestDb);
afterAll(async () => {
  delete process.env.RAZORPAY_KEY_ID;
  delete process.env.RAZORPAY_KEY_SECRET;
  await disconnectTestDb();
});

function makeValidSignature(orderId, paymentId) {
  return crypto
    .createHmac("sha256", TEST_RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
}

describe("POST /api/payments/verify", () => {
  it("returns 400 when required fields are missing", async () => {
    const { token } = await createRecruiter();

    const res = await request(app)
      .post("/api/payments/verify")
      .set(authHeader(token))
      .send({ razorpay_order_id: "order_123" }); // missing payment_id and signature

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/required/i);
  });

  it("returns 404 when payment record does not exist", async () => {
    const { token } = await createRecruiter();

    const res = await request(app)
      .post("/api/payments/verify")
      .set(authHeader(token))
      .send({
        razorpay_order_id: "order_nonexistent_xyz",
        razorpay_payment_id: "pay_123",
        razorpay_signature: "badsig"
      });

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });

  it("returns 400 and marks payment failed on invalid signature", async () => {
    const { user, token } = await createRecruiter();
    const pkg = await createRecruiterPackage();
    const payment = await createPayment(user._id, pkg, {
      razorpayOrderId: "order_badsig_test"
    });

    const res = await request(app)
      .post("/api/payments/verify")
      .set(authHeader(token))
      .send({
        razorpay_order_id: "order_badsig_test",
        razorpay_payment_id: "pay_abc",
        razorpay_signature: "completely_wrong_signature"
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/verification failed/i);

    const updated = await Payment.findById(payment._id);
    expect(updated.status).toBe("failed");
  });

  it("returns 404 when a different user tries to verify another user's order", async () => {
    const { user: userA } = await createRecruiter();
    const { token: tokenB } = await createRecruiter({
      email: `recruiterb-${Date.now()}@testcorp.com`
    });
    const pkg = await createRecruiterPackage();
    await createPayment(userA._id, pkg, {
      razorpayOrderId: "order_user_a_only"
    });

    const res = await request(app)
      .post("/api/payments/verify")
      .set(authHeader(tokenB))
      .send({
        razorpay_order_id: "order_user_a_only",
        razorpay_payment_id: "pay_xyz",
        razorpay_signature: "anysig"
      });

    // findOne includes user: req.user.id — different user gets 404
    expect(res.status).toBe(404);
  });

  it("returns alreadyVerified on second call — no duplicate audit log", async () => {
    const { user, token } = await createRecruiter();
    const pkg = await createRecruiterPackage();
    const orderId = `order_idempotent_${Date.now()}`;
    const paymentId = `pay_idempotent_${Date.now()}`;
    const validSig = makeValidSignature(orderId, paymentId);

    const payment = await createPayment(user._id, pkg, {
      razorpayOrderId: orderId
    });

    // First call — should succeed
    const first = await request(app)
      .post("/api/payments/verify")
      .set(authHeader(token))
      .send({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: validSig
      });

    expect(first.status).toBe(200);
    expect(first.body.alreadyVerified).toBeUndefined();
    expect(first.body.message).toMatch(/verified successfully/i);

    const paidAtFirst = (await Payment.findById(payment._id)).paidAt;
    const auditCountAfterFirst = await AuditLog.countDocuments({
      entityId: payment._id,
      action: "PAYMENT_VERIFIED"
    });
    expect(auditCountAfterFirst).toBe(1);

    // Second call — must be idempotent
    const second = await request(app)
      .post("/api/payments/verify")
      .set(authHeader(token))
      .send({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: validSig
      });

    expect(second.status).toBe(200);
    expect(second.body.alreadyVerified).toBe(true);
    expect(second.body.message).toMatch(/already verified/i);

    // paidAt must not have changed
    const paidAtSecond = (await Payment.findById(payment._id)).paidAt;
    expect(paidAtSecond.toISOString()).toBe(paidAtFirst.toISOString());

    // Still exactly one audit log entry
    const auditCountAfterSecond = await AuditLog.countDocuments({
      entityId: payment._id,
      action: "PAYMENT_VERIFIED"
    });
    expect(auditCountAfterSecond).toBe(1);
  });
});
