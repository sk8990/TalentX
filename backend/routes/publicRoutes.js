const router = require("express").Router();

router.get("/branding", (_req, res) => {
  const rawLogoDevToken = String(process.env.LOGO_DEV_API_KEY || "").trim();
  const logoDevToken = rawLogoDevToken.startsWith("pk_") ? rawLogoDevToken : "";

  res.setHeader("Cache-Control", "public, max-age=300");
  res.json({
    logoDevToken,
  });
});

module.exports = router;
