const Job = require("../models/Job");
const Student = require("../models/Student");
const { expireJobsByDeadline } = require("../utils/jobExpiry");
const { attachMatchScores } = require("../utils/jobMatch");

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
      query.title = { $regex: search, $options: "i" };
    }

    let jobs = await Job.find(query);
    if (sort === "deadline") {
      jobs = jobs.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    }

    const jobsWithMatch = attachMatchScores(student, jobs);
    if (sort === "match") {
      jobsWithMatch.sort((a, b) => (b.match?.score || 0) - (a.match?.score || 0));
    }

    res.json({
      student,
      jobs: jobsWithMatch
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
