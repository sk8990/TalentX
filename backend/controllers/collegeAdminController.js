const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const College = require("../models/College");
const User = require("../models/User");
const { sendEmail, emailTemplates } = require("../services/emailService");

function normalizeDomain(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/^@+/, "");
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}


exports.createCollegeAdmin = async (req, res) => {
  try {
    const {
      collegeId,
      adminName,
      adminEmail,
      password,
      packageId,
      planStartDate,
      planEndDate
    } = req.body;

    if (!collegeId || !mongoose.Types.ObjectId.isValid(collegeId)) {
      return res.status(400).json({ message: "Valid college selection is required." });
    }
    if (!adminName || !String(adminName).trim()) {
      return res.status(400).json({ message: "College Admin name is required." });
    }
    if (!adminEmail || !String(adminEmail).trim()) {
      return res.status(400).json({ message: "College Admin email is required." });
    }
    if (!password) {
      return res.status(400).json({ message: "Password is required." });
    }

    const normalizedEmail = String(adminEmail).trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: "College Admin email already exists." });
    }

    const college = await College.findById(collegeId);
    if (!college) {
      return res.status(404).json({ message: "Selected college not found." });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const adminUser = await User.create({
      name: String(adminName).trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "college_admin",
      collegeId: college._id,
      isActive: true
    });

    college.collegeAdminId = adminUser._id;

    // If package is assigned, update college enterprise plan fields
    if (packageId && mongoose.Types.ObjectId.isValid(packageId)) {
      const Package = require("../models/Package");
      const pkg = await Package.findById(packageId);
      if (pkg && ["university_admin", "admin", "university"].includes(pkg.roleTarget)) {
        college.enterprisePlanActive = true;
        college.enterprisePlanStartDate = planStartDate || new Date();
        college.enterprisePlanEndDate = planEndDate || null;

        // Assign package to the college admin user
        const { activateSubscription } = require("../services/subscriptionService");
        await activateSubscription({
          owner: adminUser._id,
          ownerRole: adminUser.role,
          planKey: pkg.key,
          packageDoc: pkg,
          source: "manual",
          provider: "manual",
          paymentProvider: "manual",
          payment: { assignedBySuperAdminId: req.user.id },
          startsAt: planStartDate ? new Date(planStartDate) : new Date()
        });
      }
    }

    await college.save();

    sendEmail({
      to: adminUser.email,
      ...emailTemplates.collegeAdminCreatedEmail({
        name: adminUser.name,
        email: adminUser.email,
        password
      })
    }).catch((error) => {
      console.error("[EMAIL] Send failed:", error.message);
    });

    return res.status(201).json({
      message: "College Admin created successfully",
      collegeAdmin: {
        _id: adminUser._id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
        collegeId: college._id
      },
      college: {
        _id: college._id,
        name: college.name,
        domain: college.domain,
        status: college.status,
        enterprisePlanActive: college.enterprisePlanActive
      }
    });
  } catch (err) {
    if (err?.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0];
      if (field === "email") {
        return res.status(409).json({ message: "College Admin email already exists." });
      }
    }
    console.error("createCollegeAdmin error:", err);
    return res.status(500).json({ message: "Unable to create College Admin" });
  }
};

exports.getCollegeAdmins = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = { role: "college_admin" };

    if (req.query.search) {
      const escaped = String(req.query.search || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      query.$or = [{ name: regex }, { email: regex }];
    }

    const [admins, total] = await Promise.all([
      User.find(query)
        .select("-password")
        .populate("collegeId", "name domain status enterprisePlanActive enterprisePlanStartDate enterprisePlanEndDate")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query)
    ]);

    return res.json({
      items: admins,
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1)
    });
  } catch (err) {
    console.error("getCollegeAdmins error:", err);
    return res.status(500).json({ message: "Unable to load college admins" });
  }
};

exports.getCollegeAdminById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const admin = await User.findById(req.params.id)
      .select("-password")
      .populate("collegeId", "name domain status enterprisePlanActive enterprisePlanStartDate enterprisePlanEndDate")
      .lean();

    if (!admin || admin.role !== "college_admin") {
      return res.status(404).json({ message: "College Admin not found." });
    }

    return res.json(admin);
  } catch (err) {
    console.error("getCollegeAdminById error:", err);
    return res.status(500).json({ message: "Unable to load college admin" });
  }
};
