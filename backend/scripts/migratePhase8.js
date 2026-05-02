/**
 * PHASE 8 MIGRATION — Recruiter Approval Status Backfill
 *
 * Problem:
 *   Recruiters created before the recruiterApprovalStatus field was added have
 *   no value for that field (missing or null). The legacy buildRecruiterQuery
 *   function treated missing/null as "approved", which allowed unreviewed
 *   recruiters to appear in the approved list and potentially bypass the
 *   approval gate.
 *
 * What this script does:
 *   Finds all User documents where:
 *     - role === "recruiter"
 *     - recruiterApprovalStatus is missing ($exists: false) OR null
 *   Sets recruiterApprovalStatus to "pending" on each of those documents.
 *
 * Safety guarantees:
 *   - Only touches recruiters with a MISSING or NULL status field.
 *   - Does NOT touch recruiters with "approved", "rejected", or "suspended".
 *   - Does NOT touch students, admins, or any other role.
 *   - Uses updateMany for efficiency; logs the count before and after.
 *   - Dry-run mode available: set DRY_RUN=true in environment.
 *
 * Usage:
 *   node scripts/migratePhase8.js
 *
 * Dry run (no writes):
 *   DRY_RUN=true node scripts/migratePhase8.js
 *
 * With explicit MongoDB URI:
 *   MONGO_URI=mongodb://... node scripts/migratePhase8.js
 */

"use strict";

require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI = String(process.env.MONGO_URI || "").trim();
if (!MONGO_URI) {
  console.error("[MIGRATE-P8] FATAL: MONGO_URI environment variable is not set.");
  process.exit(1);
}

const DRY_RUN = String(process.env.DRY_RUN || "").trim().toLowerCase() === "true";

// ── Inline schema ────────────────────────────────────────────────────────────
// We define a minimal schema here rather than importing the full User model so
// the script remains runnable even if the model file changes in the future.
// The only field we need is recruiterApprovalStatus.
const userSchema = new mongoose.Schema(
  {
    role: String,
    email: String,
    recruiterApprovalStatus: String
  },
  { strict: false, collection: "users" }
);
const User = mongoose.models.User || mongoose.model("User", userSchema);

// ── Query that identifies affected documents ─────────────────────────────────
// Matches recruiters where the field is absent OR explicitly null.
const AFFECTED_QUERY = {
  role: "recruiter",
  $or: [
    { recruiterApprovalStatus: { $exists: false } },
    { recruiterApprovalStatus: null }
  ]
};

function log(msg) {
  console.log(`[MIGRATE-P8] ${msg}`);
}

function logError(msg) {
  console.error(`[MIGRATE-P8 ERROR] ${msg}`);
}

async function run() {
  log("Starting Phase 8 migration — recruiter approval status backfill");
  if (DRY_RUN) {
    log("DRY RUN mode — no writes will be performed");
  }

  log(`Connecting to MongoDB...`);
  await mongoose.connect(MONGO_URI);
  log("Connected.");

  // ── Count affected documents before any writes ───────────────────────────
  const affectedCount = await User.countDocuments(AFFECTED_QUERY);

  if (affectedCount === 0) {
    log("No recruiters with missing or null recruiterApprovalStatus found.");
    log("Nothing to migrate. Database is already clean.");
    await mongoose.disconnect();
    process.exit(0);
  }

  log(`Found ${affectedCount} recruiter(s) with missing or null recruiterApprovalStatus.`);

  // ── Dry run: list affected emails and exit ───────────────────────────────
  if (DRY_RUN) {
    const affected = await User.find(AFFECTED_QUERY)
      .select("email recruiterApprovalStatus createdAt")
      .lean();

    log("Affected recruiters (would be set to 'pending'):");
    affected.forEach((u, i) => {
      log(
        `  ${i + 1}. ${u.email || "(no email)"} — ` +
        `current status: ${u.recruiterApprovalStatus === null ? "null" : "(missing)"} — ` +
        `created: ${u.createdAt ? new Date(u.createdAt).toISOString() : "unknown"}`
      );
    });

    log(`Dry run complete. ${affectedCount} document(s) would be updated.`);
    await mongoose.disconnect();
    process.exit(0);
  }

  // ── Live run: apply the update ───────────────────────────────────────────
  log(`Setting recruiterApprovalStatus = "pending" on ${affectedCount} document(s)...`);

  const result = await User.updateMany(
    AFFECTED_QUERY,
    { $set: { recruiterApprovalStatus: "pending" } }
  );

  const updated = result.modifiedCount ?? result.nModified ?? 0;

  // ── Verify: count should now be zero ────────────────────────────────────
  const remainingCount = await User.countDocuments(AFFECTED_QUERY);

  log("─────────────────────────────────────────");
  log("MIGRATION SUMMARY");
  log("─────────────────────────────────────────");
  log(`Recruiters found with missing/null status : ${affectedCount}`);
  log(`Recruiters updated to "pending"           : ${updated}`);
  log(`Remaining with missing/null status        : ${remainingCount}`);

  if (remainingCount > 0) {
    logError(
      `${remainingCount} document(s) were not updated. ` +
      "This may indicate a write error. Re-run the script to retry."
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  log("─────────────────────────────────────────");
  log("Migration completed successfully.");
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  logError(`Unexpected error: ${err.message}`);
  console.error(err);
  process.exit(1);
});
