const axios = require("axios");
const SupportTicket = require("../models/SupportTicket");
const Student = require("../models/Student");

exports.askAI = async (req, res) => {
  try {
    const { question } = req.body;

    const prompt = `
You are a student placement portal assistant.
Answer clearly and briefly.

Question:
${question}
`;

    const response = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ]
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY
        }
      }
    );

    const aiResponse =
      response.data.candidates?.[0]?.content?.parts?.[0]?.text;

    res.json({ answer: aiResponse });

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ message: "AI failed" });
  }
};

exports.createTicket = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    const question = String(req.body.question || "").trim();
    if (!question) {
      return res.status(400).json({ message: "Question is required" });
    }

    const ticket = await SupportTicket.create({
      requesterRole: "student",
      studentId: student._id,
      question,
      aiResponse: req.body.aiResponse,
      screenshotPath: req.file ? `/uploads/${req.file.filename}` : ""
    });

    res.json(ticket);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createRecruiterTicket = async (req, res) => {
  try {
    const question = String(req.body.question || "").trim();
    if (!question) {
      return res.status(400).json({ message: "Question is required" });
    }

    const ticket = await SupportTicket.create({
      requesterRole: "recruiter",
      recruiterId: req.user.id,
      question,
      screenshotPath: req.file ? `/uploads/${req.file.filename}` : ""
    });

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMyTickets = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    const tickets = await SupportTicket.find({ studentId: student._id })
      .sort({ createdAt: -1 });

    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMyRecruiterTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find({
      requesterRole: "recruiter",
      recruiterId: req.user.id
    }).sort({ createdAt: -1 });

    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find()
      .populate({
        path: "studentId",
        populate: { path: "userId", select: "name email" }
      })
      .populate("recruiterId", "name email")
      .sort({ createdAt: -1 });

    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.respondTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    const response = String(req.body.response || "").trim();
    if (!response) {
      return res.status(400).json({ message: "Response is required" });
    }

    if (!ticket.requesterRole) {
      ticket.requesterRole = ticket.recruiterId ? "recruiter" : "student";
    }

    ticket.adminResponse = response;
    ticket.status = "ANSWERED";

    await ticket.save();

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
