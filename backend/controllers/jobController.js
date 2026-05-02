const Job = require("../models/Job");
const Student = require("../models/Student");
const { expireJobsByDeadline } = require("../utils/jobExpiry");
const { canStudentViewJob } = require("../helpers/jobVisibilityHelper");
const { hasFullStudentAccess } = require("../helpers/studentAccessHelper");

exports.getJobsForStudent = async (req, res) => {
  try {
    await expireJobsByDeadline();

    const student = await Student.findOne({ userId: req.user.id });

    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    const jobs = await Job.find({ isActive: true })
      .populate("targetColleges", "_id name domain")
      .sort({ createdAt: -1 });
    const hasFullAccess = await hasFullStudentAccess(req.user);

    const visibleJobs = jobs.filter((job) =>
      canStudentViewJob(student, job, { user: req.user, hasFullAccess })
    );

    const jobsWithEligibility = visibleJobs.map(job => {
      const cgpaEligible = student.cgpa >= job.minCgpa;

      const branchEligible =
        job.eligibleBranches.length === 0 ||
        job.eligibleBranches.includes(student.branch);

      return {
        ...job.toObject(),
        isEligible: cgpaEligible && branchEligible
      };
    });

    res.json({
      student,
      jobs: jobsWithEligibility
    });
  } catch (err) {
    res.status(500).json({ message: "Unable to load jobs" });
  }
};
