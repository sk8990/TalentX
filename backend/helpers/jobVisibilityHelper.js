function getObjectIdString(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "object") {
    return String(value._id || value.id || value);
  }

  return String(value);
}

function getTargetCollegeIds(job) {
  const targetColleges = Array.isArray(job?.targetColleges) ? job.targetColleges : [];

  return targetColleges
    .map(getObjectIdString)
    .filter(Boolean);
}

function isVerifiedCollegeStudent(student, options = {}) {
  const user = options.user || {};

  if (user.role && user.role !== "student") {
    return false;
  }

  if (options.hasFullAccess === false) {
    return false;
  }

  return (
    (student?.studentType || "open_student") === "college_student" &&
    (student?.collegeVerificationStatus || "not_required") === "approved" &&
    student?.isCollegeVerified === true &&
    (student?.accessLevel || "limited") === "full" &&
    Boolean(student?.collegeId)
  );
}

function canStudentViewJob(student, job, options = {}) {
  if (!student || !job) {
    return false;
  }

  const visibility = job.visibilityType || (job.visibleToOffCampus === true ? "all_students" : "college_only");

  if (visibility === "all_students" || visibility === "college_plus_off_campus") {
    return true;
  }

  const targetCollegeIds = getTargetCollegeIds(job);

  // Jobs with no target colleges and no explicit college_only restriction remain visible
  if (visibility !== "college_only" && targetCollegeIds.length === 0) {
    return true;
  }

  if (!isVerifiedCollegeStudent(student, options)) {
    return false;
  }

  const studentCollegeId = getObjectIdString(student.collegeId);
  return targetCollegeIds.includes(studentCollegeId);
}

module.exports = {
  canStudentViewJob,
  getTargetCollegeIds,
  isVerifiedCollegeStudent
};
