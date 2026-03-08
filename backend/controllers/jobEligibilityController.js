const Job = require("../models/Job");
const Student = require("../models/Student");

exports.getEligibleJobs = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.id });

    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    const jobs = await Job.find({ isActive: true }).sort({ createdAt: -1 });

    res.json({
      student,
      jobs
    });

  } catch (err) {
    console.error("GET ELIGIBLE JOBS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};
