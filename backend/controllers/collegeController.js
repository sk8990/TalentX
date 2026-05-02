const mongoose = require("mongoose");
const College = require("../models/College");
const Student = require("../models/Student");

function normalizeDomain(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/^@+/, "");
}

exports.createCollege = async (req, res) => {
  try {
    const { name, domain, packageId, planStartDate, planEndDate, status } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "College name is required." });
    }

    if (!domain || !String(domain).trim()) {
      return res.status(400).json({ message: "College domain is required." });
    }

    const normalizedDomain = normalizeDomain(domain);
    if (!normalizedDomain) {
      return res.status(400).json({ message: "College domain is required." });
    }

    const existing = await College.findOne({ domain: normalizedDomain });
    if (existing) {
      return res.status(409).json({ message: "College domain already exists." });
    }

    let enterprisePlanActive = false;
    let resolvedPlanStartDate = null;
    let resolvedPlanEndDate = null;

    // If package is assigned, set enterprise plan fields
    if (packageId && mongoose.Types.ObjectId.isValid(packageId)) {
      const Package = require("../models/Package");
      const pkg = await Package.findById(packageId);
      if (pkg && ["university_admin", "admin", "university"].includes(pkg.roleTarget)) {
        enterprisePlanActive = true;
        resolvedPlanStartDate = planStartDate || new Date();
        resolvedPlanEndDate = planEndDate || null;
      }
    }

    const college = await College.create({
      name: String(name).trim(),
      domain: normalizedDomain,
      enterprisePlanActive,
      enterprisePlanStartDate: resolvedPlanStartDate,
      enterprisePlanEndDate: resolvedPlanEndDate,
      status: status || "active",
      createdBy: req.user.id
    });

    return res.status(201).json({ message: "College created successfully", college });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: "College domain already exists." });
    }
    console.error("createCollege error:", err);
    return res.status(500).json({ message: "Unable to create college" });
  }
};

exports.getColleges = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.status) {
      query.status = String(req.query.status).trim().toLowerCase();
    }
    if (req.query.search) {
      const escaped = String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      query.$or = [{ name: regex }, { domain: regex }];
    }

    const [colleges, total] = await Promise.all([
      College.find(query)
        .populate("collegeAdminId", "name email")
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      College.countDocuments(query)
    ]);

    const collegeIds = colleges.map((c) => c._id);

    const studentCounts = await Student.aggregate([
      { $match: { collegeId: { $in: collegeIds }, studentType: "college_student" } },
      {
        $group: {
          _id: "$collegeId",
          total: { $sum: 1 },
          approved: {
            $sum: { $cond: [{ $eq: ["$collegeVerificationStatus", "approved"] }, 1, 0] }
          },
          pending: {
            $sum: { $cond: [{ $eq: ["$collegeVerificationStatus", "pending"] }, 1, 0] }
          },
          rejected: {
            $sum: { $cond: [{ $eq: ["$collegeVerificationStatus", "rejected"] }, 1, 0] }
          }
        }
      }
    ]);

    const countMap = new Map();
    studentCounts.forEach((item) => {
      countMap.set(String(item._id), item);
    });

    const items = colleges.map((college) => {
      const counts = countMap.get(String(college._id)) || {
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0
      };
      return {
        ...college,
        studentCount: counts.total,
        approvedStudents: counts.approved,
        pendingStudents: counts.pending,
        rejectedStudents: counts.rejected
      };
    });

    return res.json({
      items,
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1)
    });
  } catch (err) {
    console.error("getColleges error:", err);
    return res.status(500).json({ message: "Unable to load colleges" });
  }
};

exports.getCollegeById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid college ID" });
    }

    const college = await College.findById(req.params.id)
      .populate("collegeAdminId", "name email")
      .populate("createdBy", "name email")
      .lean();

    if (!college) {
      return res.status(404).json({ message: "College not found." });
    }

    const studentCounts = await Student.aggregate([
      { $match: { collegeId: college._id, studentType: "college_student" } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          approved: {
            $sum: { $cond: [{ $eq: ["$collegeVerificationStatus", "approved"] }, 1, 0] }
          },
          pending: {
            $sum: { $cond: [{ $eq: ["$collegeVerificationStatus", "pending"] }, 1, 0] }
          },
          rejected: {
            $sum: { $cond: [{ $eq: ["$collegeVerificationStatus", "rejected"] }, 1, 0] }
          }
        }
      }
    ]);

    const counts = studentCounts[0] || { total: 0, approved: 0, pending: 0, rejected: 0 };

    return res.json({
      ...college,
      studentCount: counts.total,
      approvedStudents: counts.approved,
      pendingStudents: counts.pending,
      rejectedStudents: counts.rejected
    });
  } catch (err) {
    console.error("getCollegeById error:", err);
    return res.status(500).json({ message: "Unable to load college" });
  }
};

exports.updateCollege = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid college ID" });
    }

    const college = await College.findById(req.params.id);
    if (!college) {
      return res.status(404).json({ message: "College not found." });
    }

    const { name, domain, packageId, planStartDate, planEndDate, status } = req.body;

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({ message: "College name is required." });
      }
      college.name = String(name).trim();
    }

    if (domain !== undefined) {
      const normalizedDomain = normalizeDomain(domain);
      if (!normalizedDomain) {
        return res.status(400).json({ message: "College domain is required." });
      }
      if (normalizedDomain !== college.domain) {
        const existing = await College.findOne({ domain: normalizedDomain, _id: { $ne: college._id } });
        if (existing) {
          return res.status(409).json({ message: "College domain already exists." });
        }
        college.domain = normalizedDomain;
      }
    }

    // If package is assigned, update enterprise plan fields
    if (packageId !== undefined) {
      if (packageId && mongoose.Types.ObjectId.isValid(packageId)) {
        const Package = require("../models/Package");
        const pkg = await Package.findById(packageId);
        if (pkg && ["university_admin", "admin", "university"].includes(pkg.roleTarget)) {
          college.enterprisePlanActive = true;
          college.enterprisePlanStartDate = planStartDate || college.enterprisePlanStartDate || new Date();
          college.enterprisePlanEndDate = planEndDate || college.enterprisePlanEndDate || null;
        }
      } else {
        // Package removed
        college.enterprisePlanActive = false;
        college.enterprisePlanStartDate = null;
        college.enterprisePlanEndDate = null;
      }
    }

    if (planStartDate !== undefined) {
      college.enterprisePlanStartDate = planStartDate || null;
    }
    if (planEndDate !== undefined) {
      college.enterprisePlanEndDate = planEndDate || null;
    }
    if (status !== undefined) {
      const validStatuses = ["active", "inactive", "pending", "expired"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status value." });
      }
      college.status = status;
    }

    await college.save();

    return res.json({ message: "College updated successfully", college });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: "College domain already exists." });
    }
    console.error("updateCollege error:", err);
    return res.status(500).json({ message: "Unable to update college" });
  }
};

exports.deleteCollege = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid college ID" });
    }

    const college = await College.findById(req.params.id);
    if (!college) {
      return res.status(404).json({ message: "College not found." });
    }

    college.status = "inactive";
    await college.save();

    return res.json({ message: "College disabled successfully", college });
  } catch (err) {
    console.error("deleteCollege error:", err);
    return res.status(500).json({ message: "Unable to disable college" });
  }
};
