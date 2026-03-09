const Application = require("../models/Application");
const Job = require("../models/Job");
const Student = require("../models/Student");
const path = require("path");
const fs = require("fs");
const generatePDF = require("../utils/generateOfferPDF");
const { expireJobsByDeadline } = require("../utils/jobExpiry");

/* =========================================
   APPLY JOB
========================================= */
exports.applyJob = async (req, res) => {
  try {
    const { jobId } = req.body;
    await expireJobsByDeadline();

    if (!req.file) {
      return res.status(400).json({ message: "Resume is required to Apply" });
    }

    const student = await Student.findOne({ userId: req.user.id });

    if (!student)
      return res.status(404).json({ message: "Student profile not found" });

    const job = await Job.findById(jobId).select("isActive deadline");
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (!job.isActive || new Date(job.deadline) < new Date()) {
      return res.status(400).json({ message: "Job deadline has passed. This job is inactive." });
    }

    const existing = await Application.findOne({
      studentId: student._id,
      jobId
    });

    if (existing)
      return res.status(400).json({ message: "Already applied" });

    const application = await Application.create({
      studentId: student._id,
      jobId,
      resumeUrl: `/uploads/${req.file.filename}`,
      status: "APPLIED"
    });

    res.status(201).json(application);
  } catch (err) {
    console.error("Error applying for job:", err);
    res.status(500).json({ error: err.message });
  }
};

/* =========================================
   STUDENT: GET MY APPLICATIONS
========================================= */
exports.getMyApplications = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.id });

    if (!student)
      return res.status(404).json({ message: "Student not found" });

    const applications = await Application.find({
      studentId: student._id
    })
      .populate("jobId", "title")
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* =========================================
   RECRUITER: GET APPLICATIONS BY JOB
========================================= */
exports.getApplicationsByJob = async (req, res) => {
  try {
    const job = await Job.findOne({
      _id: req.params.jobId,
      recruiterId: req.user.id
    });

    if (!job)
      return res.status(403).json({ message: "Not authorized" });

    const applications = await Application.find({
      jobId: job._id
    })
      .populate({
        path: "studentId",
        populate: { path: "userId", select: "name email" }
      });

    res.json(applications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* =========================================
   STATUS UPDATE HELPER
========================================= */
async function updateStatus(req, res, newStatus) {
  try {
    const app = await Application.findById(req.params.applicationId)
      .populate("jobId");

    if (!app)
      return res.status(404).json({ message: "Application not found" });

    if (app.jobId.recruiterId.toString() !== req.user.id)
      return res.status(403).json({ message: "Not authorized" });

    app.status = newStatus;
    await app.save();

    res.json(app);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/* =========================================
   STATUS CONTROLLERS
========================================= */
exports.shortlistApplication = (req, res) =>
  updateStatus(req, res, "SHORTLISTED");

exports.sendAssessment = async (req, res) => {
  try {
    const { link } = req.body;
    const rawLink = typeof link === "string" ? link.trim() : "";

    if (!rawLink) {
      return res.status(400).json({ message: "Assessment link is required" });
    }

    const normalizedLink = /^https?:\/\//i.test(rawLink)
      ? rawLink
      : `https://${rawLink}`;

    const app = await Application.findById(req.params.applicationId)
      .populate("jobId");

    if (!app)
      return res.status(404).json({ message: "Application not found" });

    if (app.jobId.recruiterId.toString() !== req.user.id)
      return res.status(403).json({ message: "Not authorized" });

    app.status = "ASSESSMENT_SENT";
    app.assessment = {
      ...app.assessment,
      link: normalizedLink
    };

    await app.save();

    res.json(app);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateAssessmentResult = async (req, res) => {
  try {
    const { result, score } = req.body;

    const app = await Application.findById(req.params.applicationId);
    if (!app)
      return res.status(404).json({ message: "Application not found" });

    const isPassed = result === "PASS";

    app.assessment = {
      ...app.assessment,
      score,
      passed: isPassed
    };

    app.status = isPassed
      ? "ASSESSMENT_PASSED"
      : "ASSESSMENT_FAILED";

    await app.save();

    res.json(app);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};




exports.scheduleInterview = async (req, res) => {
  try {
    const { date, mode, link } = req.body;

    if (!date || !mode) {
      return res.status(400).json({ message: "Date and mode required" });
    }

    const app = await Application.findById(req.params.applicationId);

    if (!app)
      return res.status(404).json({ message: "Application not found" });

    app.status = "INTERVIEW_SCHEDULED";
    app.interview = { date, mode, link };

    await app.save();

    res.json(app);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.selectCandidate = (req, res) =>
  updateStatus(req, res, "SELECTED");

exports.rejectCandidate = (req, res) =>
  updateStatus(req, res, "REJECTED");

/* =========================================
   GENERATE OFFER (CORRECT VERSION)
========================================= */
exports.generateOffer = async (req, res) => {
  try {
    const { salary, joiningDate, location } = req.body;

    const app = await Application.findById(req.params.applicationId)
      .populate({
        path: "studentId",
        populate: { path: "userId", select: "name email" }
      })
      .populate("jobId");

    if (!app)
      return res.status(404).json({ message: "Application not found" });

    if (app.jobId.recruiterId.toString() !== req.user.id)
      return res.status(403).json({ message: "Not authorized" });

    if (app.status !== "SELECTED")
      return res.status(400).json({ message: "Only SELECTED candidates can receive offer" });

    const offerDir = path.join(__dirname, "../offers");
    if (!fs.existsSync(offerDir)) fs.mkdirSync(offerDir);

    const fileName = `offer_${app._id}.pdf`;
    const filePath = path.join(offerDir, fileName);

    app.offer = {
      salary,
      joiningDate,
      location,
      generatedAt: new Date(),
      status: "PENDING",
      pdfPath: `/offers/${fileName}`
    };

    await generatePDF(app, filePath);
    await app.save();

    res.json(app.offer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* =========================================
   RESPOND TO OFFER (SECURE)
========================================= */
exports.respondToOffer = async (req, res) => {
  try {
    const { decision } = req.body;

    const student = await Student.findOne({ userId: req.user.id });
    if (!student)
      return res.status(404).json({ message: "Student not found" });

    const app = await Application.findOne({
      _id: req.params.applicationId,
      studentId: student._id
    });

    if (!app || !app.offer)
      return res.status(404).json({ message: "Offer not found" });

    app.offer.status = decision;
    await app.save();

    res.json(app.offer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMyInterviews = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.id });

    if (!student)
      return res.status(404).json({ message: "Student not found" });

    const interviews = await Application.find({
      studentId: student._id,
      status: "INTERVIEW_SCHEDULED"
    })
      .populate("jobId", "title")
      .select("jobId interview status createdAt");

    res.json(interviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMyAssessments = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.id });

    if (!student)
      return res.status(404).json({ message: "Student not found" });

    const assessments = await Application.find({
      studentId: student._id,
      status: { 
        $in: ["ASSESSMENT_SENT", "ASSESSMENT_PASSED", "ASSESSMENT_FAILED"] 
      }
    })
      .populate("jobId", "title")
      .select("jobId assessment status createdAt");

    res.json(assessments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

