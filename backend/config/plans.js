const PLAN_KEYS = {
  STUDENT_FREE: "student_free",
  RECRUITER_STARTER: "recruiter_starter",
  RECRUITER_PRO: "recruiter_pro",
  UNIVERSITY_ENTERPRISE: "university_enterprise",
  // Legacy alias kept for backward compatibility.
  ENTERPRISE: "enterprise"
};

const unlimited = null;

function buildUniversityEnterprisePlan() {
  return {
    name: "University / Enterprise",
    ownerRoles: ["university_admin", "admin", "recruiter"],
    billingPeriodMonths: 12,
    limits: {
      activeJobs: unlimited,
      monthlyApplicants: unlimited,
      applicantsPerMonth: unlimited,
      studentsLimit: unlimited,
      recruitersLimit: unlimited,
      unlimitedJobs: true,
      unlimitedApplicants: true
    },
    features: {
      adminDashboard: true,
      multiCompanyPlacementManagement: true,
      bulkStudentManagement: true,
      reportsAnalytics: true,
      customOnboardingWorkflows: true,
      dedicatedSupport: true,
      assessmentPanel: true,
      humanInterviewPanel: true,
      onboardingManagement: true,
      jobPosting: true,
      basicApplicantTracking: true,
      interviewScheduling: true,
      offerGeneration: true,
      aiJdGeneration: true,
      aiCandidateMatching: true,
      prioritySupport: true
    }
  };
}

const plans = {
  [PLAN_KEYS.STUDENT_FREE]: {
    key: PLAN_KEYS.STUDENT_FREE,
    name: "Student Free",
    ownerRoles: ["student"],
    billingPeriodMonths: null,
    limits: {
      activeJobs: 0,
      monthlyApplicants: 0
    },
    features: {
      studentProfile: true,
      jobApplications: true,
      applicationTracking: true,
      studentAssessmentAccess: true,
      studentInterviewTracking: true,
      offerAcceptance: true,
      onboardingPortal: true
    }
  },

  [PLAN_KEYS.RECRUITER_STARTER]: {
    key: PLAN_KEYS.RECRUITER_STARTER,
    name: "Recruiter Starter",
    ownerRoles: ["recruiter"],
    billingPeriodMonths: 1,
    limits: {
      activeJobs: 5,
      monthlyApplicants: 100,
      applicantsPerMonth: 100,
      unlimitedJobs: false,
      unlimitedApplicants: false
    },
    features: {
      jobPosting: true,
      basicApplicantTracking: true,
      interviewScheduling: true,
      offerGeneration: true,
      aiJdGeneration: false,
      aiCandidateMatching: false,
      assessmentPanel: false,
      humanInterviewPanel: false,
      onboardingManagement: false,
      prioritySupport: false
    }
  },

  [PLAN_KEYS.RECRUITER_PRO]: {
    key: PLAN_KEYS.RECRUITER_PRO,
    name: "Recruiter Pro",
    ownerRoles: ["recruiter"],
    billingPeriodMonths: 1,
    limits: {
      activeJobs: unlimited,
      monthlyApplicants: unlimited,
      applicantsPerMonth: unlimited,
      unlimitedJobs: true,
      unlimitedApplicants: true
    },
    features: {
      jobPosting: true,
      basicApplicantTracking: true,
      interviewScheduling: true,
      offerGeneration: true,
      aiJdGeneration: true,
      aiCandidateMatching: true,
      assessmentPanel: true,
      humanInterviewPanel: true,
      onboardingManagement: true,
      prioritySupport: true
    }
  },

  [PLAN_KEYS.UNIVERSITY_ENTERPRISE]: {
    key: PLAN_KEYS.UNIVERSITY_ENTERPRISE,
    ...buildUniversityEnterprisePlan()
  },

  [PLAN_KEYS.ENTERPRISE]: {
    key: PLAN_KEYS.ENTERPRISE,
    ...buildUniversityEnterprisePlan()
  }
};

function normalizePlanKey(planKey) {
  const normalized = String(planKey || "").trim();
  if (normalized === PLAN_KEYS.ENTERPRISE) {
    return PLAN_KEYS.UNIVERSITY_ENTERPRISE;
  }
  return normalized;
}

function clonePlanConfig(planKey) {
  const normalizedPlanKey = normalizePlanKey(planKey);
  const plan = plans[normalizedPlanKey] || plans[planKey];
  if (!plan) {
    return null;
  }

  const cloned = JSON.parse(JSON.stringify(plan));
  cloned.key = normalizedPlanKey;
  return cloned;
}

function getPlansForFeature(featureName) {
  const uniquePlans = [
    plans[PLAN_KEYS.STUDENT_FREE],
    plans[PLAN_KEYS.RECRUITER_STARTER],
    plans[PLAN_KEYS.RECRUITER_PRO],
    plans[PLAN_KEYS.UNIVERSITY_ENTERPRISE]
  ].filter(Boolean);

  return uniquePlans
    .filter((plan) => Boolean(plan.features?.[featureName]))
    .map((plan) => plan.key);
}

module.exports = {
  PLAN_KEYS,
  plans,
  clonePlanConfig,
  getPlansForFeature,
  normalizePlanKey
};
