const Student = require("../models/Student");

exports.createOrUpdateProfile = async (req, res) => {
  try {
    const { branch, year, cgpa, skills } = req.body;

    const student = await Student.findOneAndUpdate(
      { userId: req.user.id },
      { branch, year, cgpa, skills },
      { new: true, runValidators: true }
    ).populate("userId", "name email");

    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    res.json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.id })
      .populate("userId", "name email");

    if (!student) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.uploadResume = async (req, res) => {
  try {
    const { resumeUrl } = req.body;

    const student = await Student.findOne({ userId: req.user.id });

    if (!student)
      return res.status(404).json({ message: "Student not found" });

    student.resumeUrl = resumeUrl;
    await student.save();

    res.json({ message: "Resume updated successfully" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};