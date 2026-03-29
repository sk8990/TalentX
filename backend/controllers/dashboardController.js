const Application = require("../models/Application");
const Student = require("../models/Student");
const Job = require("../models/Job");
const { attachMatchScores, normalizeList } = require("../utils/jobMatch");

// F3: Student Dashboard - get comprehensive stats
exports.getStudentDashboard = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.id })
      .populate("userId", "name email");

    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    const applications = await Application.find({ studentId: student._id })
      .populate("jobId", "title companyName companyLogo ctc")
      .sort({ updatedAt: -1 });

    // Stats
    const totalApplied = applications.length;
    const shortlisted = applications.filter(a => a.status === "SHORTLISTED").length;
    const interviewScheduled = applications.filter(a => a.status === "INTERVIEW_SCHEDULED").length;
    const selected = applications.filter(a => a.status === "SELECTED").length;
    const rejected = applications.filter(a => a.status === "REJECTED").length;
    const assessmentPending = applications.filter(a =>
      ["ASSESSMENT_SENT"].includes(a.status)
    ).length;

    // Upcoming interviews
    const upcomingInterviews = applications
      .filter(a => a.status === "INTERVIEW_SCHEDULED" && a.interview?.date)
      .filter(a => new Date(a.interview.date) >= new Date())
      .sort((a, b) => new Date(a.interview.date) - new Date(b.interview.date))
      .slice(0, 5);

    // Recent activity (last 5 status changes)
    const recentActivity = applications.slice(0, 5).map(app => ({
      _id: app._id,
      jobTitle: app.jobId?.title || "Unknown",
      companyName: app.jobId?.companyName || "Unknown",
      status: app.status,
      updatedAt: app.updatedAt,
    }));

    // Offers received
    const offers = applications.filter(a => a.offer && a.status === "SELECTED");

    res.json({
      student,
      stats: {
        totalApplied,
        shortlisted,
        interviewScheduled,
        selected,
        rejected,
        assessmentPending,
      },
      upcomingInterviews,
      recentActivity,
      offers,
      applicationTimeline: applications.map(app => ({
        _id: app._id,
        jobTitle: app.jobId?.title || "Unknown",
        companyName: app.jobId?.companyName || "Unknown",
        companyLogo: app.jobId?.companyLogo || "",
        status: app.status,
        appliedAt: app.createdAt,
        updatedAt: app.updatedAt,
        assessment: app.assessment,
        interview: app.interview,
        offer: app.offer,
      })),
    });
  } catch (err) {
    console.error("Student dashboard error:", err);
    res.status(500).json({ message: err.message });
  }
};

// F5: AI Job Recommendations
exports.getJobRecommendations = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Find active jobs matching student's profile
    const preferredRoles = normalizeList(student.preferences?.preferredRoles).map((role) => role.toLowerCase());
    const preferredLocations = normalizeList(student.preferences?.preferredLocations).map((location) => location.toLowerCase());
    const preferredMinCtc = Number(student.preferences?.minCtc || 0);

    const eligibleJobs = await Job.find({
      isActive: true,
      minCgpa: { $lte: student.cgpa || 0 },
      $or: [
        { eligibleBranches: { $size: 0 } },
        { eligibleBranches: student.branch },
      ],
    })
      .sort({ ctc: -1, createdAt: -1 })
      .limit(10);

    // Find already applied job IDs
    const appliedApps = await Application.find({ studentId: student._id }).select("jobId");
    const appliedJobIds = appliedApps.map(a => a.jobId.toString());

    // Filter out already applied
    let recommendations = eligibleJobs.filter(
      (job) => !appliedJobIds.includes(job._id.toString())
    );

    if (preferredMinCtc > 0) {
      recommendations = recommendations.filter((job) => Number(job.ctc || 0) >= preferredMinCtc);
    }

    if (preferredRoles.length) {
      recommendations = recommendations.filter((job) =>
        preferredRoles.some((role) =>
          `${job.title || ""} ${job.description || ""}`.toLowerCase().includes(role)
        )
      );
    }

    if (preferredLocations.length) {
      recommendations = recommendations.filter((job) =>
        preferredLocations.some((location) =>
          `${job.aboutCompany || ""} ${job.description || ""} ${job.companyName || ""}`
            .toLowerCase()
            .includes(location)
        )
      );
    }

    recommendations = attachMatchScores(student, recommendations)
      .sort((a, b) => (b.match?.score || 0) - (a.match?.score || 0));

    res.json({ recommendations });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
