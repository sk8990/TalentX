const Job = require("../models/Job");

async function expireJobsByDeadline() {
  const now = new Date();

  await Job.updateMany(
    {
      isActive: true,
      deadline: { $lt: now },
    },
    { $set: { isActive: false } }
  );
}

module.exports = {
  expireJobsByDeadline,
};
