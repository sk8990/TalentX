/**
 * Jest global setup file — runs before every test file.
 * Sets environment variables that must be present before any module loads.
 */
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "talentx-test-secret-do-not-use-in-production";
process.env.MONGO_URI = "mongodb://127.0.0.1:27017/talentx_test_placeholder";
process.env.ENABLE_SCHEDULER = "false";
// Prevent email service from connecting to Ethereal during tests
process.env.SMTP_HOST = "";
