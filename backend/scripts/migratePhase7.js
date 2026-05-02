/**
 * PHASE 7 MIGRATION SCRIPT
 *
 * This script safely migrates old data to ensure compatibility with new features.
 *
 * Run with: node scripts/migratePhase7.js
 *
 * Features:
 * - Adds missing student defaults
 * - Adds missing recruiter approval defaults
 * - Adds missing job visibility defaults
 * - Normalizes college domains
 * - Safe: Does not delete data
 * - Logs all changes
 */

const mongoose = require("mongoose");
require("dotenv").config();

const User = require("../models/User");
const Student = require("../models/Student");
const Job = require("../models/Job");
const College = require("../models/College");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/talentx";

// Migration stats
const stats = {
  studentsUpdated: 0,
  recruitersUpdated: 0,
  jobsUpdated: 0,
  collegesUpdated: 0,
  errors: []
};

function log(message) {
  console.log(`[MIGRATION] ${message}`);
}

function logError(message) {
  console.error(`[MIGRATION ERROR] ${message}`);
  stats.errors.push(message);
}

/**
 * Migrate old students to have default values
 */
async function migrateStudents() {
  log("Migrating students...");

  // Find students missing studentType
  const studentsWithoutType = await Student.find({ studentType: { $exists: false } });
  for (const student of studentsWithoutType) {
    try {
      student.studentType = "open_student";
      await student.save();
      stats.studentsUpdated++;
      log(`  - Set studentType to 'open_student' for student ${student._id}`);
    } catch (err) {
      logError(`Failed to update student ${student._id}: ${err.message}`);
    }
  }

  // Find students missing collegeVerificationStatus
  const studentsWithoutVerification = await Student.find({
    collegeVerificationStatus: { $exists: false }
  });
  for (const student of studentsWithoutVerification) {
    try {
      student.collegeVerificationStatus = "not_required";
      await student.save();
      stats.studentsUpdated++;
      log(`  - Set collegeVerificationStatus to 'not_required' for student ${student._id}`);
    } catch (err) {
      logError(`Failed to update student ${student._id}: ${err.message}`);
    }
  }

  // Find students missing isCollegeVerified
  const studentsWithoutVerified = await Student.find({ isCollegeVerified: { $exists: false } });
  for (const student of studentsWithoutVerified) {
    try {
      student.isCollegeVerified = false;
      await student.save();
      stats.studentsUpdated++;
      log(`  - Set isCollegeVerified to false for student ${student._id}`);
    } catch (err) {
      logError(`Failed to update student ${student._id}: ${err.message}`);
    }
  }

  // Find students missing accessLevel
  const studentsWithoutAccess = await Student.find({ accessLevel: { $exists: false } });
  for (const student of studentsWithoutAccess) {
    try {
      student.accessLevel = "limited";
      await student.save();
      stats.studentsUpdated++;
      log(`  - Set accessLevel to 'limited' for student ${student._id}`);
    } catch (err) {
      logError(`Failed to update student ${student._id}: ${err.message}`);
    }
  }

  log(`  Students migrated: ${stats.studentsUpdated}`);
}

/**
 * Migrate old recruiters to have approval defaults
 */
async function migrateRecruiters() {
  log("Migrating recruiters...");

  // Find recruiters missing recruiterApprovalStatus
  const recruitersWithoutStatus = await User.find({
    role: "recruiter",
    recruiterApprovalStatus: { $exists: false }
  });
  for (const recruiter of recruitersWithoutStatus) {
    try {
      // Check if they have isApproved set to true
      const isApproved = recruiter.isApproved === true;
      recruiter.recruiterApprovalStatus = isApproved ? "approved" : "pending";
      await recruiter.save();
      stats.recruitersUpdated++;
      log(`  - Set recruiterApprovalStatus to '${recruiter.recruiterApprovalStatus}' for recruiter ${recruiter._id}`);
    } catch (err) {
      logError(`Failed to update recruiter ${recruiter._id}: ${err.message}`);
    }
  }

  // Find recruiters missing isRecruiterApproved
  const recruitersWithoutApproved = await User.find({
    role: "recruiter",
    isRecruiterApproved: { $exists: false }
  });
  for (const recruiter of recruitersWithoutApproved) {
    try {
      const isApproved = recruiter.isApproved === true || recruiter.recruiterApprovalStatus === "approved";
      recruiter.isRecruiterApproved = isApproved;
      await recruiter.save();
      stats.recruitersUpdated++;
      log(`  - Set isRecruiterApproved to ${recruiter.isRecruiterApproved} for recruiter ${recruiter._id}`);
    } catch (err) {
      logError(`Failed to update recruiter ${recruiter._id}: ${err.message}`);
    }
  }

  log(`  Recruiters migrated: ${stats.recruitersUpdated}`);
}

/**
 * Migrate old jobs to have visibility defaults
 */
async function migrateJobs() {
  log("Migrating jobs...");

  // Find jobs missing targetColleges
  const jobsWithoutTargetColleges = await Job.find({ targetColleges: { $exists: false } });
  for (const job of jobsWithoutTargetColleges) {
    try {
      job.targetColleges = [];
      await job.save();
      stats.jobsUpdated++;
      log(`  - Set targetColleges to [] for job ${job._id}`);
    } catch (err) {
      logError(`Failed to update job ${job._id}: ${err.message}`);
    }
  }

  // Find jobs missing visibleToOffCampus
  const jobsWithoutOffCampus = await Job.find({ visibleToOffCampus: { $exists: false } });
  for (const job of jobsWithoutOffCampus) {
    try {
      // If job has no targetColleges, assume it was visible to everyone
      const hasTargetColleges = Array.isArray(job.targetColleges) && job.targetColleges.length > 0;
      job.visibleToOffCampus = !hasTargetColleges;
      await job.save();
      stats.jobsUpdated++;
      log(`  - Set visibleToOffCampus to ${job.visibleToOffCampus} for job ${job._id}`);
    } catch (err) {
      logError(`Failed to update job ${job._id}: ${err.message}`);
    }
  }

  // Find jobs missing visibilityType
  const jobsWithoutVisibilityType = await Job.find({ visibilityType: { $exists: false } });
  for (const job of jobsWithoutVisibilityType) {
    try {
      const hasTargetColleges = Array.isArray(job.targetColleges) && job.targetColleges.length > 0;
      const visibleToOffCampus = job.visibleToOffCampus === true;

      if (hasTargetColleges && !visibleToOffCampus) {
        job.visibilityType = "college_only";
      } else if (hasTargetColleges && visibleToOffCampus) {
        job.visibilityType = "college_plus_off_campus";
      } else {
        job.visibilityType = "all_students";
      }
      await job.save();
      stats.jobsUpdated++;
      log(`  - Set visibilityType to '${job.visibilityType}' for job ${job._id}`);
    } catch (err) {
      logError(`Failed to update job ${job._id}: ${err.message}`);
    }
  }

  log(`  Jobs migrated: ${stats.jobsUpdated}`);
}

/**
 * Normalize college domains
 */
async function normalizeCollegeDomains() {
  log("Normalizing college domains...");

  const colleges = await College.find({});
  for (const college of colleges) {
    try {
      const originalDomain = college.domain;
      const normalizedDomain = String(college.domain || "")
        .trim()
        .toLowerCase()
        .replace(/^@+/, "");

      if (originalDomain !== normalizedDomain) {
        college.domain = normalizedDomain;
        await college.save();
        stats.collegesUpdated++;
        log(`  - Normalized domain from '${originalDomain}' to '${normalizedDomain}' for college ${college._id}`);
      }
    } catch (err) {
      logError(`Failed to normalize college ${college._id}: ${err.message}`);
    }
  }

  log(`  Colleges normalized: ${stats.collegesUpdated}`);
}

/**
 * Main migration function
 */
async function migrate() {
  try {
    log("Starting Phase 7 migration...");
    log("Connecting to MongoDB...");

    await mongoose.connect(MONGO_URI);
    log("Connected to MongoDB");

    await migrateStudents();
    await migrateRecruiters();
    await migrateJobs();
    await normalizeCollegeDomains();

    log("\n=== MIGRATION SUMMARY ===");
    log(`Students updated: ${stats.studentsUpdated}`);
    log(`Recruiters updated: ${stats.recruitersUpdated}`);
    log(`Jobs updated: ${stats.jobsUpdated}`);
    log(`Colleges updated: ${stats.collegesUpdated}`);
    log(`Errors: ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      log("\nErrors encountered:");
      stats.errors.forEach((err) => logError(err));
    }

    log("\nMigration completed successfully!");
    process.exit(0);
  } catch (err) {
    logError(`Migration failed: ${err.message}`);
    process.exit(1);
  }
}

// Run migration
migrate();
