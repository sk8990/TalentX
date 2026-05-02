const Job = require("../models/Job");
const Application = require("../models/Application");

// ─── GET /api/college-admin/jobs ───
exports.getCollegeJobs = async (req, res) => {
  try {
    const collegeId = req.collegeAdminUser.collegeId;

    const jobs = await Job.find({ targetColleges: collegeId })
      .select("_id title companyName companyLogo recruiterId targetColleges visibilityType isActive deadline createdAt")
      .populate("recruiterId", "name email companyName")
      .populate("targetColleges", "_id name")
      .sort({ createdAt: -1 })
      .lean();

    // Attach application counts
    const jobIds = jobs.map((j) => j._id);
    const appCounts = await Application.aggregate([
      { $match: { jobId: { $in: jobIds } } },
      { $group: { _id: "$jobId", count: { $sum: 1 } } }
    ]);

    const countMap = {};
    appCounts.forEach((a) => {
      countMap[a._id.toString()] = a.count;
    });

    const enrichedJobs = jobs.map((j) => ({
      ...j,
      applicationCount: countMap[j._id.toString()] || 0
    }));

    return res.json({ jobs: enrichedJobs });
  } catch (err) {
    console.error("getCollegeJobs error:", err);
    return res.status(500).json({ message: "Unable to load college jobs." });
  }
};
