const Job = require("../models/Job");
const Student = require("../models/Student");

exports.getJobsForStudent = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.id });

    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    const jobs = await Job.find({ isActive: true }).sort({ createdAt: -1 });

    const jobsWithEligibility = jobs.map(job => {
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
    res.status(500).json({ error: err.message });
  }
};
