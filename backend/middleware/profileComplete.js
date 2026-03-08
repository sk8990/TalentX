const Student = require("../models/Student");

module.exports = async (req, res, next) => {
  try {
    const student = await Student.findOne({ userId: req.user.id });

    if (!student) {
      return res.status(403).json({
        message: "Student profile not found"
      });
    }

    const isComplete =
      student.branch &&
      student.year &&
      student.cgpa > 0;

    if (!isComplete) {
      return res.status(403).json({
        message: "Please complete your profile before applying for jobs"
      });
    }

    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
