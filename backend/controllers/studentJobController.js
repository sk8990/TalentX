const Job = require("../models/Job");
const Student = require("../models/Student");
const { expireJobsByDeadline } = require("../utils/jobExpiry");
const { attachMatchScores } = require("../utils/jobMatch");
const { canStudentViewJob } = require("../helpers/jobVisibilityHelper");
const { hasFullStudentAccess } = require("../helpers/studentAccessHelper");

exports.getEligibleJobs = async (req, res) => {
  try {
    const { search, sort } = req.query;
    await expireJobsByDeadline();

    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    const query = { isActive: true };
    if (search) {
      const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.title = { $regex: escaped, $options: "i" };
    }

    let jobs = await Job.find(query).populate("targetColleges", "_id name domain");
    if (sort === "deadline") {
      jobs = jobs.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    }

    const hasFullAccess = await hasFullStudentAccess(req.user);
    const visibleJobs = jobs.filter((job) =>
      canStudentViewJob(student, job, { user: req.user, hasFullAccess })
    );

    const jobsWithMatch = attachMatchScores(student, visibleJobs);
    if (sort === "match") {
      jobsWithMatch.sort((a, b) => (b.match?.score || 0) - (a.match?.score || 0));
    }

    res.json({
      student,
      jobs: jobsWithMatch
    });
  } catch (err) {
    console.error("getEligibleJobs error:", err);
    res.status(500).json({ message: "Unable to load jobs" });
  }
};
