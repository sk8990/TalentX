const { generateJobDescription: geminiGenerate } = require("../services/geminiService");

exports.generateJobDescription = async (req, res) => {
  try {
    const { title, experience, skills } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Job title is required" });
    }

    let skillList = "";
    if (Array.isArray(skills)) {
      skillList = skills.join(", ");
    } else if (typeof skills === "string") {
      skillList = skills;
    }

    const description = await geminiGenerate({
      title,
      experience: experience || "Not specified",
      skills: skillList || "Not specified",
    });

    if (!description) {
      return res.status(500).json({ message: "AI returned empty response" });
    }

    res.json({ description });

  } catch (err) {
    console.error("Gemini Error:", err.message);
    res.status(500).json({ message: "AI generation failed: " + err.message });
  }
};