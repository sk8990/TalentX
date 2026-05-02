"use strict";

jest.mock("nodemailer");

function clearEmailEnv() {
  delete process.env.EMAIL_HOST;
  delete process.env.EMAIL_PORT;
  delete process.env.EMAIL_USER;
  delete process.env.EMAIL_PASS;
  delete process.env.EMAIL_FROM;
  delete process.env.EMAIL_SECURE;
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_PORT;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  delete process.env.SMTP_FROM;
  delete process.env.SMTP_SECURE;
}

function loadEmailService(env = {}) {
  jest.resetModules();
  clearEmailEnv();
  Object.assign(process.env, env);

  const nodemailer = require("nodemailer");
  const sendMail = jest.fn().mockResolvedValue({ messageId: "msg-test-123" });
  nodemailer.createTransport.mockReturnValue({ sendMail });

  return {
    nodemailer,
    sendMail,
    service: require("../services/emailService")
  };
}

afterEach(() => {
  jest.restoreAllMocks();
  clearEmailEnv();
});

describe("emailService", () => {
  it("skips sending safely when SMTP is not configured", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const { nodemailer, service } = loadEmailService();

    const result = await service.sendEmail({
      to: "admin@example.com",
      subject: "TalentX test",
      text: "Hello"
    });

    expect(result).toEqual({
      success: false,
      error: "SMTP not configured",
      skipped: true
    });
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith("[EMAIL] Email not sent: SMTP not configured");
  });

  it("uses EMAIL_* configuration before SMTP_* fallback", async () => {
    const infoSpy = jest.spyOn(console, "info").mockImplementation(() => {});
    const { nodemailer, sendMail, service } = loadEmailService({
      EMAIL_HOST: "smtp.email.example",
      EMAIL_PORT: "2525",
      EMAIL_USER: "email-user@example.com",
      EMAIL_PASS: "email-secret",
      EMAIL_FROM: "TalentX <email-user@example.com>",
      SMTP_HOST: "smtp.legacy.example",
      SMTP_USER: "legacy@example.com",
      SMTP_PASS: "legacy-secret"
    });

    const result = await service.sendEmail({
      to: "college-admin@example.com",
      subject: "TalentX account created - College Admin",
      html: "<p>Hello</p>",
      text: "Hello"
    });

    expect(result).toEqual({ success: true, messageId: "msg-test-123" });
    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: "smtp.email.example",
      port: 2525,
      secure: false,
      auth: {
        user: "email-user@example.com",
        pass: "email-secret"
      }
    });
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      from: "TalentX <email-user@example.com>",
      to: "college-admin@example.com",
      subject: "TalentX account created - College Admin"
    }));
    expect(infoSpy).toHaveBeenCalledWith("[EMAIL] Email sent: msg-test-123");
  });

  it("falls back to SMTP_* configuration", async () => {
    const { nodemailer, service } = loadEmailService({
      SMTP_HOST: "smtp.legacy.example",
      SMTP_PORT: "587",
      SMTP_USER: "legacy@example.com",
      SMTP_PASS: "legacy-secret",
      SMTP_FROM: "TalentX Legacy <legacy@example.com>"
    });

    const result = await service.sendEmail({
      to: "student@example.com",
      subject: "Welcome to TalentX",
      text: "Welcome"
    });

    expect(result.success).toBe(true);
    expect(nodemailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({
      host: "smtp.legacy.example",
      port: 587,
      auth: {
        user: "legacy@example.com",
        pass: "legacy-secret"
      }
    }));
  });

  it("redacts SMTP passwords from logged send failures", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const { sendMail, service } = loadEmailService({
      EMAIL_HOST: "smtp.email.example",
      EMAIL_USER: "email-user@example.com",
      EMAIL_PASS: "super-secret-password"
    });
    sendMail.mockRejectedValueOnce(new Error("Bad password: super-secret-password"));

    const result = await service.sendEmail({
      to: "recruiter@example.com",
      subject: "TalentX recruiter account approved",
      text: "Approved"
    });

    expect(result.success).toBe(false);
    expect(result.error).not.toContain("super-secret-password");
    expect(errorSpy.mock.calls.flat().join(" ")).not.toContain("super-secret-password");
  });

  it("builds requested TalentX templates with text and html bodies", () => {
    const { service } = loadEmailService({ FRONTEND_URL: "http://localhost:3000" });
    const collegeAdmin = service.emailTemplates.collegeAdminCreatedEmail({
      name: "Priya",
      email: "priya@example.com",
      password: "Temp123!"
    });
    const interviewer = service.emailTemplates.interviewerCreatedEmail({
      name: "Sam",
      email: "sam@example.com",
      temporaryPassword: "Temp456!"
    });

    expect(collegeAdmin.subject).toContain("TalentX account created");
    expect(collegeAdmin.text).toContain("Temporary password: Temp123!");
    expect(collegeAdmin.html).toContain("priya@example.com");
    expect(interviewer.subject).toContain("interviewer account created");
    expect(interviewer.text).toContain("Temporary password: Temp456!");
  });
});
