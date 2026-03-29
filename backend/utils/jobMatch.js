function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function getJobText(job) {
  return normalizeText(
    [
      job?.title,
      job?.description,
      job?.aboutCompany,
      job?.eligibilityText,
      job?.companyName
    ].filter(Boolean).join(" ")
  );
}

function getJobSkills(job) {
  const rawSkills = [
    ...normalizeList(job?.skills),
    ...normalizeList(job?.requiredSkills),
    ...normalizeList(job?.keySkills),
    ...normalizeList(job?.techStack)
  ];

  return [...new Set(rawSkills.map((skill) => normalizeText(skill)).filter(Boolean))];
}

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function getCtcPreferenceScore(student, job) {
  const preferredMin = Number(student?.preferences?.minCtc || 0);
  const jobCtc = Number(job?.ctc || 0);

  if (!preferredMin || preferredMin <= 0) return 0.6;
  if (!jobCtc || jobCtc <= 0) return 0;

  return clamp(jobCtc / preferredMin, 0, 1);
}

function getRolePreferenceScore(student, job) {
  const preferredRoles = normalizeList(student?.preferences?.preferredRoles).map(normalizeText);
  if (!preferredRoles.length) return 0.6;

  const jobText = getJobText(job);
  return preferredRoles.some((role) => jobText.includes(role)) ? 1 : 0;
}

function getSkillMatch(student, job) {
  const studentSkills = normalizeList(student?.skills).map(normalizeText).filter(Boolean);
  const explicitJobSkills = new Set(getJobSkills(job));
  const jobText = getJobText(job);

  if (!studentSkills.length) {
    return {
      ratio: 0.35,
      matchedSkills: [],
      totalStudentSkills: 0
    };
  }

  const matchedSkills = studentSkills.filter((skill) =>
    explicitJobSkills.has(skill) || jobText.includes(skill)
  );

  const ratio = clamp(matchedSkills.length / studentSkills.length, 0, 1);
  return {
    ratio,
    matchedSkills: [...new Set(matchedSkills)],
    totalStudentSkills: studentSkills.length
  };
}

function getEligibility(student, job) {
  const minCgpa = Number(job?.minCgpa || 0);
  const studentCgpa = Number(student?.cgpa || 0);
  const branches = Array.isArray(job?.eligibleBranches) ? job.eligibleBranches : [];
  const studentBranch = String(student?.branch || "").trim().toUpperCase();

  const cgpaEligible = studentCgpa >= minCgpa;
  const branchEligible = !branches.length || branches.includes(studentBranch);

  return {
    cgpaEligible,
    branchEligible,
    eligible: cgpaEligible && branchEligible,
    minCgpa,
    studentCgpa,
    branches
  };
}

function calculateMatch(student, job) {
  const eligibility = getEligibility(student, job);
  const skillMatch = getSkillMatch(student, job);
  const ctcPreference = getCtcPreferenceScore(student, job);
  const rolePreference = getRolePreferenceScore(student, job);
  const cgpaBonus = eligibility.cgpaEligible
    ? clamp((eligibility.studentCgpa - eligibility.minCgpa) / 2, 0, 1)
    : 0;

  let score = 0;
  if (eligibility.eligible) {
    score += 45;
    score += skillMatch.ratio * 25;
    score += ctcPreference * 10;
    score += rolePreference * 10;
    score += cgpaBonus * 10;
  } else {
    score += 20;
    score += skillMatch.ratio * 20;
    score += ctcPreference * 10;
    score += rolePreference * 10;
  }

  const reasons = [];
  if (!eligibility.cgpaEligible) {
    reasons.push(`CGPA below requirement (${eligibility.studentCgpa} < ${eligibility.minCgpa})`);
  } else {
    reasons.push("CGPA meets requirement");
  }

  if (!eligibility.branchEligible) {
    reasons.push(`Branch not in eligible list (${eligibility.branches.join(", ")})`);
  } else {
    reasons.push("Branch eligibility matched");
  }

  if (skillMatch.totalStudentSkills > 0) {
    reasons.push(`${skillMatch.matchedSkills.length}/${skillMatch.totalStudentSkills} skills matched`);
  }

  const preferredMinCtc = Number(student?.preferences?.minCtc || 0);
  if (preferredMinCtc > 0) {
    if (Number(job?.ctc || 0) >= preferredMinCtc) {
      reasons.push("CTC meets your preference");
    } else {
      reasons.push("CTC below your preference");
    }
  }

  return {
    score: Math.round(clamp(score / 100, 0, 1) * 100),
    eligible: eligibility.eligible,
    reasons: reasons.slice(0, 4),
    matchedSkills: skillMatch.matchedSkills
  };
}

function attachMatchScores(student, jobs) {
  return jobs.map((job) => {
    const plain = typeof job.toObject === "function" ? job.toObject() : { ...job };
    return {
      ...plain,
      match: calculateMatch(student, plain)
    };
  });
}

module.exports = {
  calculateMatch,
  attachMatchScores,
  normalizeList,
  normalizeText
};
