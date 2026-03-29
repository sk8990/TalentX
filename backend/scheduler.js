const cron = require("node-cron");
const { expireJobsByDeadline } = require("./utils/jobExpiry");

function startScheduledTasks() {
  // Run job expiry check every hour
  cron.schedule("0 * * * *", async () => {
    try {
      await expireJobsByDeadline();
      console.log("[CRON] Job expiry check completed");
    } catch (err) {
      console.error("[CRON] Job expiry error:", err.message);
    }
  });

  // Also run once on startup
  expireJobsByDeadline()
    .then(() => console.log("[CRON] Initial job expiry check completed"))
    .catch((err) => console.error("[CRON] Initial job expiry error:", err.message));

  console.log("[CRON] Scheduled tasks started");
}

module.exports = { startScheduledTasks };
