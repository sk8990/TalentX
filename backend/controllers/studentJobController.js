const Job = require("../models/Job");
const Student = require("../models/Student");
const { expireJobsByDeadline } = require("../utils/jobExpiry");

exports.getEligibleJobs = async (req, res) => {
  try {
    const { search, sort } = req.query;
    await expireJobsByDeadline();

    const student = await Student.findOne({ userId: req.user.id });

    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    let query = { isActive: true };

    // 🔎 Search by title
    if (search) {
      query.title = { $regex: search, $options: "i" };
    }

    let jobs = await Job.find(query);

    // ⏰ Sort by deadline
    if (sort === "deadline") {
      jobs = jobs.sort(
        (a, b) => new Date(a.deadline) - new Date(b.deadline)
      );
    }

    res.json({
      student,
      jobs
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

