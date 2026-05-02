const Student = require("../models/Student");
const College = require("../models/College");
const StudentUsage = require("../models/StudentUsage");

const OPEN_STUDENT_LIMITS = {
  jobApplicationsPerMonth: 5,
  aiInterviewsPerMonth: 2,
  skillTestsPerMonth: 3,
  resumeCount: 1,
  humanInterviewAccess: false,
  offerLetterAccess: false,
  onboardingAccess: false,
  premiumResourcesAccess: false
};

function getUserId(userOrId) {
  const rawId =
    userOrId && typeof userOrId === "object"
      ? userOrId._id || userOrId.id
      : userOrId;

  return rawId ? String(rawId) : "";
}

function getCurrentMonthKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

async function hasFullStudentAccess(user) {
  if (!user || user.role !== "student") {
    return false;
  }

  const userId = getUserId(user);
  if (!userId) {
    return false;
  }

  const student = await Student.findOne({ userId });
  if (!student) {
    return false;
  }

  const studentType = student.studentType || "open_student";
  const verificationStatus = student.collegeVerificationStatus || "not_required";
  const isVerified = student.isCollegeVerified === true;
  const accessLevel = student.accessLevel || "limited";
  const collegeId = student.collegeId;

  if (
    studentType !== "college_student" ||
    verificationStatus !== "approved" ||
    !isVerified ||
    accessLevel !== "full" ||
    !collegeId
  ) {
    return false;
  }

  const college = await College.findById(collegeId);
  if (!college) {
    return false;
  }

  return (
    college.enterprisePlanActive === true &&
    college.status === "active"
  );
}

async function isLimitedStudent(user) {
  if (!user || user.role !== "student") {
    return false;
  }

  return !(await hasFullStudentAccess(user));
}

async function getOrCreateStudentUsage(userId) {
  const normalizedUserId = getUserId(userId);
  if (!normalizedUserId) {
    throw new Error("Student user ID is required for usage tracking.");
  }

  const monthKey = getCurrentMonthKey();

  let usage = await StudentUsage.findOne({ userId: normalizedUserId, month: monthKey });

  if (!usage) {
    usage = await StudentUsage.create({
      userId: normalizedUserId,
      month: monthKey,
      jobApplicationsUsed: 0,
      aiInterviewsUsed: 0,
      skillTestsUsed: 0,
      resumesCreated: 0
    });
  }

  return usage;
}

async function checkStudentLimit(user, feature) {
  const hasFullAccess = await hasFullStudentAccess(user);

  if (hasFullAccess) {
    return { allowed: true, hasFullAccess: true };
  }

  const usage = await getOrCreateStudentUsage(getUserId(user));

  const limits = OPEN_STUDENT_LIMITS;

  switch (feature) {
    case "job_application":
      return {
        allowed: usage.jobApplicationsUsed < limits.jobApplicationsPerMonth,
        hasFullAccess: false,
        used: usage.jobApplicationsUsed,
        limit: limits.jobApplicationsPerMonth,
        remaining: limits.jobApplicationsPerMonth - usage.jobApplicationsUsed
      };
    case "ai_interview":
      return {
        allowed: usage.aiInterviewsUsed < limits.aiInterviewsPerMonth,
        hasFullAccess: false,
        used: usage.aiInterviewsUsed,
        limit: limits.aiInterviewsPerMonth,
        remaining: limits.aiInterviewsPerMonth - usage.aiInterviewsUsed
      };
    case "skill_test":
      return {
        allowed: usage.skillTestsUsed < limits.skillTestsPerMonth,
        hasFullAccess: false,
        used: usage.skillTestsUsed,
        limit: limits.skillTestsPerMonth,
        remaining: limits.skillTestsPerMonth - usage.skillTestsUsed
      };
    case "resume_create":
      return {
        allowed: usage.resumesCreated < limits.resumeCount,
        hasFullAccess: false,
        used: usage.resumesCreated,
        limit: limits.resumeCount,
        remaining: limits.resumeCount - usage.resumesCreated
      };
    case "human_interview":
      return {
        allowed: limits.humanInterviewAccess,
        hasFullAccess: false,
        message: "Human interview scheduling is available only for verified Enterprise college students."
      };
    case "offer_letter":
      return {
        allowed: limits.offerLetterAccess,
        hasFullAccess: false,
        message: "Offer letter access is available only after college verification."
      };
    case "onboarding":
      return {
        allowed: limits.onboardingAccess,
        hasFullAccess: false,
        message: "Onboarding access is available only for verified Enterprise college students."
      };
    case "premium_resources":
      return {
        allowed: limits.premiumResourcesAccess,
        hasFullAccess: false,
        message: "Premium placement resources are available only for verified Enterprise college students."
      };
    default:
      return { allowed: false, hasFullAccess: false };
  }
}

async function incrementStudentUsage(userId, feature) {
  const normalizedUserId = getUserId(userId);
  if (!normalizedUserId) {
    throw new Error("Student user ID is required for usage tracking.");
  }

  const monthKey = getCurrentMonthKey();

  const updateMap = {
    job_application: { $inc: { jobApplicationsUsed: 1 } },
    ai_interview: { $inc: { aiInterviewsUsed: 1 } },
    skill_test: { $inc: { skillTestsUsed: 1 } },
    resume_create: { $inc: { resumesCreated: 1 } }
  };

  const update = updateMap[feature];
  if (!update) {
    return null;
  }

  const usage = await StudentUsage.findOneAndUpdate(
    { userId: normalizedUserId, month: monthKey },
    update,
    { new: true, upsert: true }
  );

  return usage;
}

async function getStudentAccessType(user) {
  if (!user || user.role !== "student") {
    return { accessType: "unknown", hasFullAccess: false };
  }

  const userId = getUserId(user);
  if (!userId) {
    return { accessType: "unknown", hasFullAccess: false };
  }

  const student = await Student.findOne({ userId });
  if (!student) {
    return { accessType: "unknown", hasFullAccess: false };
  }

  const studentType = student.studentType || "open_student";
  const verificationStatus = student.collegeVerificationStatus || "not_required";
  const isVerified = student.isCollegeVerified === true;
  const accessLevel = student.accessLevel || "limited";

  if (studentType === "open_student") {
    return {
      accessType: "open_student",
      hasFullAccess: false,
      verificationStatus: "not_required"
    };
  }

  if (studentType === "college_student") {
    if (verificationStatus === "approved" && isVerified && accessLevel === "full") {
      const hasFullAccess = await hasFullStudentAccess(user);
      if (hasFullAccess) {
        return {
          accessType: "verified_college_student",
          hasFullAccess: true,
          verificationStatus: "approved"
        };
      }
    }

    if (verificationStatus === "pending") {
      return {
        accessType: "pending_college_student",
        hasFullAccess: false,
        verificationStatus: "pending"
      };
    }

    if (verificationStatus === "rejected") {
      return {
        accessType: "rejected_college_student",
        hasFullAccess: false,
        verificationStatus: "rejected"
      };
    }
  }

  return {
    accessType: "limited",
    hasFullAccess: false,
    verificationStatus: verificationStatus
  };
}

async function getStudentAccessSummary(user) {
  const accessInfo = await getStudentAccessType(user);
  const hasFullAccess = accessInfo.hasFullAccess;

  if (hasFullAccess) {
    const student = await Student.findOne({ userId: getUserId(user) }).populate("collegeId", "name domain enterprisePlanActive status");
    return {
      accessType: accessInfo.accessType,
      hasFullAccess: true,
      currentMonth: getCurrentMonthKey(),
      limits: null,
      usage: null,
      remaining: null,
      collegeName: student?.collegeId?.name || null,
      verificationStatus: accessInfo.verificationStatus,
      enterprisePlanActive: student?.collegeId?.enterprisePlanActive || false
    };
  }

  const usage = await getOrCreateStudentUsage(getUserId(user));
  const limits = OPEN_STUDENT_LIMITS;

  return {
    accessType: accessInfo.accessType,
    hasFullAccess: false,
    currentMonth: getCurrentMonthKey(),
    limits: {
      jobApplicationsPerMonth: limits.jobApplicationsPerMonth,
      aiInterviewsPerMonth: limits.aiInterviewsPerMonth,
      skillTestsPerMonth: limits.skillTestsPerMonth,
      resumeCount: limits.resumeCount
    },
    usage: {
      jobApplicationsUsed: usage.jobApplicationsUsed,
      aiInterviewsUsed: usage.aiInterviewsUsed,
      skillTestsUsed: usage.skillTestsUsed,
      resumesCreated: usage.resumesCreated
    },
    remaining: {
      jobApplications: limits.jobApplicationsPerMonth - usage.jobApplicationsUsed,
      aiInterviews: limits.aiInterviewsPerMonth - usage.aiInterviewsUsed,
      skillTests: limits.skillTestsPerMonth - usage.skillTestsUsed,
      resumes: limits.resumeCount - usage.resumesCreated
    },
    verificationStatus: accessInfo.verificationStatus
  };
}

function simplifyApplicationStatusForLimitedStudent(status) {
  const simplifiedMap = {
    "APPLIED": "Applied",
    "SHORTLISTED": "Shortlisted",
    "ASSESSMENT_SENT": "Applied",
    "ASSESSMENT_PASSED": "Applied",
    "ASSESSMENT_FAILED": "Rejected",
    "INTERVIEW_SCHEDULED": "Applied",
    "SELECTED": "Applied",
    "REJECTED": "Rejected"
  };

  return simplifiedMap[status] || status;
}

module.exports = {
  OPEN_STUDENT_LIMITS,
  getUserId,
  getCurrentMonthKey,
  hasFullStudentAccess,
  isLimitedStudent,
  getOrCreateStudentUsage,
  checkStudentLimit,
  incrementStudentUsage,
  getStudentAccessType,
  getStudentAccessSummary,
  simplifyApplicationStatusForLimitedStudent
};
