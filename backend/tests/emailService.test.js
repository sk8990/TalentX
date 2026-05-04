"use strict";

jest.mock("nodemailer");
jest.mock("axios");

function clearEmailEnv() {
  delete process.env.EMAIL_DRIVER;
  delete process.env.EMAIL_FROM_NAME;
  delete process.env.EMAIL_FROM_EMAIL;
  delete process.env.EMAIL_TIMEOUT_MS;
  delete process.env.MAILPIT_HOST;
  delete process.env.MAILPIT_PORT;
  delete process.env.BREVO_API_KEY;
  delete process.env.EMAIL_FROM;
  delete process.env.EMAIL_PASS;
  delete process.env.SMTP_PASS;
}

function loadEmailService(env = {}) {
  jest.resetModules();
  clearEmailEnv();
  Object.assign(process.env, env);

  const nodemailer = require("nodemailer");
  const sendMail = jest.fn().mockResolvedValue({ messageId: "msg-test-123" });
  nodemailer.createTransport.mockReturnValue({ sendMail });

  const axios = require("axios");
  axios.post = jest.fn().mockResolvedValue({ data: { messageId: "brevo-msg-456" } });

  return {
    nodemailer,
    axios,
    sendMail,
    service: require("../services/emailService")
  };
}

afterEach(() => {
  jest.restoreAllMocks();
  clearEmailEnv();
});

describe("emailService", () => {
  it("logs email when no driver is configured", async () => {
    const infoSpy = jest.spyOn(console, "info").mockImplementation(() => {});
    const { nodemailer, service } = loadEmailService();

    const result = await service.sendEmail({
      to: "admin@example.com",
      subject: "TalentX test",
      text: "Hello"
    });

    expect(result).toEqual({
      success: false,
      error: "Email driver not configured",
      skipped: true
    });
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith("[EMAIL] Driver not configured — logging email instead");
  });

  it("sends via Mailpit using Nodemailer", async () => {
    const infoSpy = jest.spyOn(console, "info").mockImplementation(() => {});
    const { nodemailer, sendMail, service } = loadEmailService({
      EMAIL_DRIVER: "mailpit",
      MAILPIT_HOST: "127.0.0.1",
      MAILPIT_PORT: "1025",
      EMAIL_FROM_NAME: "TalentX",
      EMAIL_FROM_EMAIL: "no-reply@talentx.com"
    });

    const result = await service.sendEmail({
      to: "college-admin@example.com",
      subject: "TalentX account created - College Admin",
      html: "<p>Hello</p>",
      text: "Hello"
    });

    expect(result).toEqual({ success: true, messageId: "msg-test-123" });
    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: "127.0.0.1",
      port: 1025,
      secure: false,
      auth: undefined
    });
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      from: "TalentX <no-reply@talentx.com>",
      to: "college-admin@example.com",
      subject: "TalentX account created - College Admin"
    }));
    expect(infoSpy).toHaveBeenCalledWith("[EMAIL] Using Mailpit");
  });

  it("sends via Brevo REST API", async () => {
    const infoSpy = jest.spyOn(console, "info").mockImplementation(() => {});
    const { axios, nodemailer, service } = loadEmailService({
      EMAIL_DRIVER: "brevo",
      BREVO_API_KEY: "xkeysib-test-key",
      EMAIL_FROM_NAME: "TalentX",
      EMAIL_FROM_EMAIL: "no-reply@talentx.com"
    });

    const result = await service.sendEmail({
      to: "student@example.com",
      subject: "Welcome to TalentX",
      html: "<p>Welcome</p>",
      text: "Welcome"
    });

    expect(result).toEqual({ success: true, messageId: "brevo-msg-456" });
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
    expect(axios.post).toHaveBeenCalledWith(
      "https://api.brevo.com/v3/smtp/email",
      expect.objectContaining({
        sender: { name: "TalentX", email: "no-reply@talentx.com" },
        to: [{ email: "student@example.com" }],
        subject: "Welcome to TalentX"
      }),
      expect.objectContaining({
        headers: expect.objectContaining({ "api-key": "xkeysib-test-key" }),
        timeout: 8000
      })
    );
    expect(infoSpy).toHaveBeenCalledWith("[EMAIL] Using Brevo API");
  });

  it("warns when Brevo API key is missing", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const { service } = loadEmailService({ EMAIL_DRIVER: "brevo" });

    const result = await service.sendEmail({
      to: "test@example.com",
      subject: "Test",
      text: "Test"
    });

    expect(result).toEqual({
      success: false,
      error: "Brevo API key not configured",
      skipped: true
    });
    expect(warnSpy).toHaveBeenCalledWith("[EMAIL] Brevo API key is missing");
  });

  it("redacts API keys from logged send failures", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const { sendMail, service } = loadEmailService({
      EMAIL_DRIVER: "mailpit",
      BREVO_API_KEY: "super-secret-key"
    });
    sendMail.mockRejectedValueOnce(new Error("Connection failed: super-secret-key"));

    const result = await service.sendEmail({
      to: "recruiter@example.com",
      subject: "TalentX recruiter account approved",
      text: "Approved"
    });

    expect(result.success).toBe(false);
    expect(result.error).not.toContain("super-secret-key");
    expect(errorSpy.mock.calls.flat().join(" ")).not.toContain("super-secret-key");
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
