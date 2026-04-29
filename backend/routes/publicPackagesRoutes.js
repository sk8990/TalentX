const express = require("express");
const router = express.Router();
const Package = require("../models/Package");

async function getPublicPackages(_req, res) {
  try {
    const packages = await Package.find({
      isActive: true,
      isVisibleOnLandingPage: true
    }).sort({ displayOrder: 1 }).lean();

    return res.json({ packages });
  } catch (err) {
    return res.status(500).json({ message: "Unable to fetch public packages" });
  }
}

router.get("/public", getPublicPackages);

module.exports = router;
