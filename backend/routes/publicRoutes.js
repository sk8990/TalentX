const router = require("express").Router();
const College = require("../models/College");

router.get("/branding", (_req, res) => {
  const rawLogoDevToken = String(process.env.LOGO_DEV_API_KEY || "").trim();
  const logoDevToken = rawLogoDevToken.startsWith("pk_") ? rawLogoDevToken : "";

  res.setHeader("Cache-Control", "public, max-age=300");
  res.json({
    logoDevToken,
  });
});

router.get("/active-colleges", async (_req, res) => {
  try {
    const colleges = await College.find(
      { enterprisePlanActive: true, status: "active" },
      { _id: 1, name: 1, domain: 1 }
    )
      .sort({ name: 1 })
      .lean();

    res.setHeader("Cache-Control", "public, max-age=120");
    res.json({ colleges });
  } catch (err) {
    console.error("active-colleges error:", err);
    res.status(500).json({ message: "Unable to load colleges" });
  }
});

module.exports = router;
