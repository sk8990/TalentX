const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const { downloadRootUpload, downloadOnboardingDocument } = require("../controllers/fileDownloadController");

router.get("/root/:filename", auth, downloadRootUpload);
router.get("/onboarding-documents/:filename", auth, downloadOnboardingDocument);

module.exports = router;
