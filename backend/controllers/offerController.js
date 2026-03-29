const axios = require("axios");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const Application = require("../models/Application");

function generatePdfFromText(filePath, text) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(filePath);

    stream.on("finish", resolve);
    stream.on("error", reject);
    doc.on("error", reject);

    doc.pipe(stream);
    doc.fontSize(12).text(text || "Offer letter content unavailable.");
    doc.end();
  });
}

exports.generateOffer = async (req, res) => {
  try {
    const salary = String(req.body?.salary || "").trim();
    const joiningDate = String(req.body?.joiningDate || "").trim();
    const location = String(req.body?.location || "").trim();

    if (!salary || !joiningDate || !location) {
      return res.status(400).json({ message: "Salary, joining date, and location are required" });
    }

    const parsedJoiningDate = new Date(joiningDate);
    if (Number.isNaN(parsedJoiningDate.getTime())) {
      return res.status(400).json({ message: "Joining date must be a valid date" });
    }

    const app = await Application.findById(req.params.applicationId)
      .populate({
        path: "studentId",
        populate: { path: "userId", select: "name email" }
      })
      .populate("jobId", "title recruiterId");

    if (!app) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (!app.jobId || app.jobId.recruiterId?.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (app.status !== "SELECTED") {
      return res.status(400).json({ message: "Only SELECTED candidates can receive offer" });
    }

    const prompt = `
Generate a formal job offer letter.

Candidate Name: ${app.studentId?.userId?.name || "Candidate"}
Position: ${app.jobId?.title || "Role"}
Salary: ${salary}
Joining Date: ${joiningDate}
Location: ${location}

Make it professional and official.
`;

    const aiResponse = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        contents: [{ parts: [{ text: prompt }] }]
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY
        }
      }
    );

    const offerText = aiResponse.data.candidates?.[0]?.content?.parts?.[0]?.text || "Offer letter content unavailable.";

    const offerDir = path.join(__dirname, "../offers");
    if (!fs.existsSync(offerDir)) {
      fs.mkdirSync(offerDir, { recursive: true });
    }

    const fileName = `offer_${app._id}.pdf`;
    const filePath = path.join(offerDir, fileName);

    await generatePdfFromText(filePath, offerText);

    app.offer = {
      salary,
      joiningDate: parsedJoiningDate,
      location,
      generatedAt: new Date(),
      status: "PENDING",
      pdfPath: `/offers/${fileName}`
    };

    await app.save();

    res.json({ message: "Offer generated successfully", offer: app.offer });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ message: "Offer generation failed" });
  }
};
