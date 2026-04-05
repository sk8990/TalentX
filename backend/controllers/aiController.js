const fs = require("fs");
const {
  generateJobDescription: geminiGenerate,
  parseJobDescription: geminiParseJobDescription,
  parseJobDescriptionPdf: geminiParseJobDescriptionPdf,
} = require("../services/geminiService");

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

exports.parseJobDescription = async (req, res) => {
  try {
    const jdText = String(req.body?.jdText || "").trim();

    if (jdText.length < 30) {
      return res.status(400).json({
        message: "Paste a fuller job description before parsing",
      });
    }

    const parsed = await geminiParseJobDescription({ jdText });

    res.json({ parsed });
  } catch (err) {
    console.error("Gemini JD Parse Error:", err.message);
    res.status(500).json({ message: "AI JD parsing failed: " + err.message });
  }
};

exports.parseUploadedJobDescription = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "JD PDF is required" });
    }

    const parsed = await geminiParseJobDescriptionPdf(req.file);

    res.json({
      message: "JD parsed and job form auto-filled",
      parsed,
      uploadedFileName: req.file.originalname,
    });
  } catch (err) {
    console.error("Gemini JD Upload Parse Error:", err.message);
    res.status(500).json({ message: "AI JD parsing failed: " + err.message });
  } finally {
    if (req.file?.path) {
      fs.promises.unlink(req.file.path).catch(() => {});
    }
  }
};
