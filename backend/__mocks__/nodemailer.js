"use strict";
// Mock nodemailer so tests never connect to Ethereal or any SMTP server.
const nodemailer = {
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: "test-message-id" })
  }),
  createTestAccount: jest.fn().mockResolvedValue({
    user: "test@ethereal.email",
    pass: "testpass"
  }),
  getTestMessageUrl: jest.fn().mockReturnValue("https://ethereal.email/message/test")
};
module.exports = nodemailer;
