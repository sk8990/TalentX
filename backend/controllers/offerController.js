const axios = require("axios");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

exports.generateOffer = async (req, res) => {
  try {
    const { salary, joiningDate, location } = req.body;

    const app = await Application.findById(req.params.applicationId)
      .populate({
        path: "studentId",
        populate: { path: "userId", select: "name email" }
      })
      .populate("jobId", "title");

    if (!app)
      return res.status(404).json({ message: "Application not found" });

    // 🔥 AI PROMPT
    const prompt = `
    Generate a formal job offer letter.

    Candidate Name: ${app.studentId.userId.name}
    Position: ${app.jobId.title}
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

    const offerText =
      aiResponse.data.candidates?.[0]?.content?.parts?.[0]?.text;

    // PDF generation
    const offerDir = path.join(__dirname, "../offers");
    if (!fs.existsSync(offerDir)) fs.mkdirSync(offerDir);

    const fileName = `offer_${app._id}.pdf`;
    const filePath = path.join(offerDir, fileName);

    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(filePath));
    doc.fontSize(12).text(offerText);
    doc.end();

    // Save to DB
    app.offer = {
      salary,
      joiningDate,
      location,
      generatedAt: new Date(),
      status: "PENDING",
      pdfPath: `/offers/${fileName}`
    };

    await app.save();

    res.json({ message: "Offer generated successfully" });

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ message: "Offer generation failed" });
  }
};