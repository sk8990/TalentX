const AuditLog = require("../models/AuditLog");

async function writeAuditLog(entry) {
  try {
    return await AuditLog.create(entry);
  } catch (err) {
    console.error("[AUDIT] Failed to write audit log:", err.message);
    return null;
  }
}

module.exports = {
  writeAuditLog
};
