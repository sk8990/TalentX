const Student = require("../models/Student");
const { parseResumePdf } = require("../services/resumeParserService");

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

function normalizePreferences(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const minCtc = Number(source.minCtc);
  return {
    alertsEnabled: source.alertsEnabled !== false,
    preferredRoles: normalizeList(source.preferredRoles),
    preferredLocations: normalizeList(source.preferredLocations),
    minCtc: Number.isFinite(minCtc) && minCtc >= 0 ? minCtc : 0
  };
}

exports.createOrUpdateProfile = async (req, res) => {
  try {
    const { branch, year, cgpa, skills, preferences } = req.body;
    const parsedCgpa = Number(cgpa);
    const normalizedBranch = String(branch || "").trim().toUpperCase();
    const updates = {
      branch: normalizedBranch || null,
      year: String(year || "").trim(),
      cgpa: Number.isFinite(parsedCgpa) ? parsedCgpa : 0,
      skills: normalizeList(skills)
    };

    if (preferences !== undefined) {
      updates.preferences = normalizePreferences(preferences);
    }

    const student = await Student.findOneAndUpdate(
      { userId: req.user.id },
      updates,
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

exports.parseResumeAndAutofill = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Resume PDF is required" });
    }

    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const parsed = await parseResumePdf(req.file.path);
    const updates = {
      resumeUrl: `/uploads/${req.file.filename}`,
      resumeParsedAt: new Date()
    };

    if (parsed.branch) updates.branch = parsed.branch;
    if (parsed.year) updates.year = parsed.year;
    if (parsed.cgpa !== null) updates.cgpa = parsed.cgpa;
    if (parsed.skills.length) updates.skills = parsed.skills;
    if (parsed.summary) updates.resumeSummary = parsed.summary;

    updates.preferences = {
      ...(student.preferences || {}),
      preferredRoles: parsed.preferredRoles.length
        ? parsed.preferredRoles
        : student.preferences?.preferredRoles || [],
      preferredLocations: parsed.preferredLocations.length
        ? parsed.preferredLocations
        : student.preferences?.preferredLocations || [],
      minCtc: parsed.minCtc !== null
        ? parsed.minCtc
        : Number(student.preferences?.minCtc || 0),
      alertsEnabled: student.preferences?.alertsEnabled !== false
    };

    const updated = await Student.findOneAndUpdate(
      { userId: req.user.id },
      updates,
      { new: true, runValidators: true }
    ).populate("userId", "name email");

    res.json({
      message: "Resume parsed and profile auto-filled",
      parsed,
      student: updated
    });
  } catch (err) {
    console.error("Resume parse error:", err.message);
    res.status(500).json({
      message: "Failed to parse resume",
      error: err.message
    });
  }
};
