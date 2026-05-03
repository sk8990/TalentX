const axios = require("axios");
const SupportTicket = require("../models/SupportTicket");
const Student = require("../models/Student");
const User = require("../models/User");
const { notify, notifyTicketAnswered } = require("../services/notificationService");

function getScreenshotPath(req) {
  return req.file ? `/uploads/${req.file.filename}` : "";
}

function normalizeQuestion(req) {
  return String(req.body?.question || "").trim();
}

function normalizePriority(value) {
  const priority = String(value || "MEDIUM").trim().toUpperCase();
  return ["LOW", "MEDIUM", "HIGH", "URGENT"].includes(priority) ? priority : "MEDIUM";
}

function buildMessage({ senderId, senderRole, message }) {
  return {
    senderId: senderId || null,
    senderRole,
    message,
    createdAt: new Date()
  };
}

function isApprovedCollegeStudent(student) {
  return (
    String(student?.studentType || "") === "college_student" &&
    Boolean(student?.collegeId) &&
    (
      student?.isCollegeVerified === true ||
      String(student?.collegeVerificationStatus || "").toLowerCase() === "approved"
    )
  );
}

function getStudentTicketRoute(student) {
  if (isApprovedCollegeStudent(student)) {
    return {
      collegeId: student.collegeId,
      assignedToRole: "college_admin",
      assignedCollegeId: student.collegeId
    };
  }

  return {
    collegeId: student?.collegeId || null,
    assignedToRole: "super_admin",
    assignedCollegeId: null
  };
}

function populateTicketQuery(query) {
  return query
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "name email" }
    })
    .populate("recruiterId", "name email")
    .populate("requesterId", "name email role collegeId")
    .populate("collegeId", "name domain")
    .populate("assignedCollegeId", "name domain");
}

async function notifyRequester(ticket) {
  const requesterRole = String(ticket.requesterRole || "").toLowerCase();

  if (requesterRole === "student" && ticket.studentId) {
    const student = await Student.findById(ticket.studentId).select("userId");
    const studentUserId = student?.userId ? student.userId.toString() : null;
    if (studentUserId) {
      await notifyTicketAnswered(studentUserId, ticket._id.toString());
    }
    return;
  }

  const notifyUserId = ticket.recruiterId || ticket.requesterId;
  if (!notifyUserId) {
    return;
  }

  const link =
    requesterRole === "recruiter"
      ? "/recruiter/support"
      : requesterRole === "college_admin"
        ? "/college-admin/support"
        : "/admin/support";

  await notify({
    userId: notifyUserId.toString(),
    type: "TICKET_ANSWERED",
    title: "Support Ticket Answered",
    message: "Your support ticket has been responded to by an admin.",
    link,
    metadata: { ticketId: ticket._id.toString() },
    sendMail: false
  });
}

async function appendTicketResponse({ ticket, req, response }) {
  ticket.adminResponse = response;
  ticket.status = "ANSWERED";
  ticket.messages = [
    ...(Array.isArray(ticket.messages) ? ticket.messages : []),
    buildMessage({
      senderId: req.user.id,
      senderRole: req.user.role,
      message: response
    })
  ];

  await ticket.save();

  notifyRequester(ticket).catch((err) => {
    console.error("[NOTIFY] ticket response notification failed:", err.message);
  });

  return ticket;
}

async function getCollegeAdminCollegeId(userId) {
  const user = await User.findById(userId).select("collegeId role");
  return user?.collegeId || null;
}

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

    const question = normalizeQuestion(req);
    if (!question) {
      return res.status(400).json({ message: "Question is required" });
    }

    const route = getStudentTicketRoute(student);
    const ticket = await SupportTicket.create({
      requesterId: req.user.id,
      requesterRole: "student",
      studentId: student._id,
      collegeId: route.collegeId,
      assignedToRole: route.assignedToRole,
      assignedCollegeId: route.assignedCollegeId,
      question,
      aiResponse: req.body.aiResponse,
      screenshotPath: getScreenshotPath(req),
      priority: normalizePriority(req.body?.priority),
      messages: [buildMessage({ senderId: req.user.id, senderRole: "student", message: question })]
    });

    res.status(201).json(ticket);

  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.createRecruiterTicket = async (req, res) => {
  try {
    const question = normalizeQuestion(req);
    if (!question) {
      return res.status(400).json({ message: "Question is required" });
    }

    const ticket = await SupportTicket.create({
      requesterId: req.user.id,
      requesterRole: "recruiter",
      recruiterId: req.user.id,
      assignedToRole: "super_admin",
      assignedCollegeId: null,
      question,
      screenshotPath: getScreenshotPath(req),
      priority: normalizePriority(req.body?.priority),
      messages: [buildMessage({ senderId: req.user.id, senderRole: "recruiter", message: question })]
    });

    res.status(201).json(ticket);
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.createCollegeAdminTicket = async (req, res) => {
  try {
    const question = normalizeQuestion(req);
    if (!question) {
      return res.status(400).json({ message: "Question is required" });
    }

    const collegeId = await getCollegeAdminCollegeId(req.user.id);
    if (!collegeId) {
      return res.status(400).json({ message: "College Admin is not linked to a college" });
    }

    const ticket = await SupportTicket.create({
      requesterId: req.user.id,
      requesterRole: "college_admin",
      collegeId,
      assignedToRole: "super_admin",
      assignedCollegeId: null,
      question,
      screenshotPath: getScreenshotPath(req),
      priority: normalizePriority(req.body?.priority),
      messages: [buildMessage({ senderId: req.user.id, senderRole: "college_admin", message: question })]
    });

    res.status(201).json(ticket);
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getMyTickets = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    const tickets = await populateTicketQuery(
      SupportTicket.find({
        $or: [
          { studentId: student._id },
          { requesterId: req.user.id, requesterRole: "student" }
        ]
      }).sort({ createdAt: -1 })
    );

    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getMyRecruiterTickets = async (req, res) => {
  try {
    const tickets = await populateTicketQuery(
      SupportTicket.find({
        $or: [
          { requesterRole: "recruiter", recruiterId: req.user.id },
          { requesterRole: "recruiter", requesterId: req.user.id }
        ]
      }).sort({ createdAt: -1 })
    );

    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getCollegeAdminTickets = async (req, res) => {
  try {
    const collegeId = await getCollegeAdminCollegeId(req.user.id);
    if (!collegeId) {
      return res.status(400).json({ message: "College Admin is not linked to a college" });
    }

    const assignedTickets = await populateTicketQuery(
      SupportTicket.find({
        assignedToRole: "college_admin",
        assignedCollegeId: collegeId
      }).sort({ createdAt: -1 })
    );

    const myTickets = await populateTicketQuery(
      SupportTicket.find({
        requesterId: req.user.id,
        requesterRole: "college_admin"
      }).sort({ createdAt: -1 })
    );

    res.json({ assignedTickets, myTickets });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getAllTickets = async (req, res) => {
  try {
    const includeAll = req.query?.all === "true";
    const filter = includeAll
      ? {}
      : {
          $or: [
            { assignedToRole: "super_admin" },
            { assignedToRole: { $exists: false } },
            { assignedToRole: null }
          ]
        };

    const tickets = await populateTicketQuery(
      SupportTicket.find(filter).sort({ createdAt: -1 })
    );

    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.respondCollegeTicket = async (req, res) => {
  try {
    const collegeId = await getCollegeAdminCollegeId(req.user.id);
    if (!collegeId) {
      return res.status(400).json({ message: "College Admin is not linked to a college" });
    }

    const ticket = await SupportTicket.findOne({
      _id: req.params.id,
      assignedToRole: "college_admin",
      assignedCollegeId: collegeId
    });

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    const response = String(req.body.response || "").trim();
    if (!response) {
      return res.status(400).json({ message: "Response is required" });
    }

    await appendTicketResponse({ ticket, req, response });
    const populated = await populateTicketQuery(SupportTicket.findById(ticket._id));
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
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
    if (!ticket.requesterId && ticket.recruiterId) {
      ticket.requesterId = ticket.recruiterId;
    }
    if (!ticket.assignedToRole) {
      ticket.assignedToRole = "super_admin";
    }

    await appendTicketResponse({ ticket, req, response });
    const populated = await populateTicketQuery(SupportTicket.findById(ticket._id));
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};
