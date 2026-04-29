const express = require("express");
const router = express.Router();
const EnterprisePackageRequest = require("../models/EnterprisePackageRequest");

function toOptionalNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

router.post("/", async (req, res) => {
  try {
    const organizationName = String(req.body?.organizationName || "").trim();
    const requesterName = String(req.body?.requesterName || req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const phone = String(req.body?.phone || "").trim();

    if (!organizationName || !requesterName || !email || !phone) {
      return res.status(400).json({ message: "Organization, contact name, email, and phone are required." });
    }

    const request = await EnterprisePackageRequest.create({
      organizationName,
      requesterName,
      name: requesterName,
      email,
      phone,
      expectedCandidates: toOptionalNumber(req.body?.expectedCandidates),
      expectedRecruiters: toOptionalNumber(req.body?.expectedRecruiters),
      message: String(req.body?.message || "").trim(),
      requestedPackageId: req.body?.requestedPackageId || null,
      roleTarget: "university"
    });
    return res.status(201).json({ message: "Enterprise request submitted successfully", request });
  } catch (err) {
    console.error("createEnterpriseRequest error:", err);
    return res.status(500).json({ message: "Unable to submit request" });
  }
});

module.exports = router;
