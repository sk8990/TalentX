const mongoose = require("mongoose");
const User = require("../models/User");
const { writeAuditLog } = require("../services/auditService");
const { notifyRecruiterApproved } = require("../services/notificationService");
const { sendEmail, emailTemplates } = require("../services/emailService");


function buildRecruiterQuery(status) {
  const query = { role: "recruiter" };

  if (status === "approved") {
    // Only explicitly approved recruiters.
    // Missing or null status must NOT be treated as approved — those
    // recruiters have never been reviewed and belong in the pending list.
    query.recruiterApprovalStatus = "approved";
  } else if (status === "rejected") {
    query.recruiterApprovalStatus = "rejected";
  } else if (status === "suspended") {
    query.recruiterApprovalStatus = "suspended";
  } else {
    // Pending: includes explicitly "pending" AND records where the field is
    // missing or null (legacy accounts created before the field existed).
    // The migration script (scripts/migratePhase8.js) backfills these to
    // "pending", but the query handles them defensively in the meantime.
    query.$or = [
      { recruiterApprovalStatus: "pending" },
      { recruiterApprovalStatus: { $exists: false } },
      { recruiterApprovalStatus: null }
    ];
  }

  return query;
}

async function listRecruitersByStatus(req, res, status) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;
    const query = buildRecruiterQuery(status);

    if (req.query.search) {
      const escaped = String(req.query.search || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      query.$and = query.$and || [];
      query.$and.push({
        $or: [{ name: regex }, { email: regex }, { companyName: regex }]
      });
    }

    const [recruiters, total] = await Promise.all([
      User.find(query)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query)
    ]);

    return res.json({
      items: recruiters,
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1)
    });
  } catch (err) {
    console.error(`listRecruiters (${status}) error:`, err);
    return res.status(500).json({ message: "Unable to load recruiters" });
  }
}

exports.getPendingRecruiters = (req, res) => listRecruitersByStatus(req, res, "pending");
exports.getApprovedRecruiters = (req, res) => listRecruitersByStatus(req, res, "approved");
exports.getRejectedRecruiters = (req, res) => listRecruitersByStatus(req, res, "rejected");
exports.getSuspendedRecruiters = (req, res) => listRecruitersByStatus(req, res, "suspended");

exports.approveRecruiter = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid recruiter ID" });
    }

    const user = await User.findById(req.params.id);
    if (!user || user.role !== "recruiter") {
      return res.status(404).json({ message: "Recruiter not found." });
    }

    if (user.recruiterApprovalStatus === "approved") {
      return res.status(400).json({ message: "Recruiter is already approved." });
    }

    user.recruiterApprovalStatus = "approved";
    user.approvedBy = req.user.id;
    user.approvedAt = new Date();
    await user.save();

    await writeAuditLog({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "RECRUITER_APPROVED",
      entityType: "USER",
      entityId: user._id,
      metadata: { recruiterEmail: user.email }
    });

    notifyRecruiterApproved(user._id.toString(), user.name || "Recruiter").catch((err) => {
      console.error("[NOTIFY] recruiter approval notification failed:", err.message);
    });

    sendEmail({
      to: user.email,
      ...emailTemplates.recruiterApprovedEmail({
        name: user.name,
        email: user.email
      })
    }).catch((error) => {
      console.error("[EMAIL] Send failed:", error.message);
    });

    return res.json({
      message: "Recruiter approved successfully"
    });
  } catch (err) {
    console.error("approveRecruiter error:", err);
    return res.status(500).json({ message: "Unable to approve recruiter" });
  }
};

exports.rejectRecruiter = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid recruiter ID" });
    }

    const user = await User.findById(req.params.id);
    if (!user || user.role !== "recruiter") {
      return res.status(404).json({ message: "Recruiter not found." });
    }

    user.recruiterApprovalStatus = "rejected";
    await user.save();

    await writeAuditLog({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "RECRUITER_REJECTED",
      entityType: "USER",
      entityId: user._id,
      metadata: { recruiterEmail: user.email }
    });

    return res.json({ message: "Recruiter rejected successfully" });
  } catch (err) {
    console.error("rejectRecruiter error:", err);
    return res.status(500).json({ message: "Unable to reject recruiter" });
  }
};

exports.suspendRecruiter = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid recruiter ID" });
    }

    const user = await User.findById(req.params.id);
    if (!user || user.role !== "recruiter") {
      return res.status(404).json({ message: "Recruiter not found." });
    }

    user.recruiterApprovalStatus = "suspended";
    await user.save();

    await writeAuditLog({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "RECRUITER_SUSPENDED",
      entityType: "USER",
      entityId: user._id,
      metadata: { recruiterEmail: user.email }
    });

    return res.json({ message: "Recruiter suspended successfully" });
  } catch (err) {
    console.error("suspendRecruiter error:", err);
    return res.status(500).json({ message: "Unable to suspend recruiter" });
  }
};
