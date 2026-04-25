const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadDirectory = path.join(__dirname, "../uploads/onboarding-documents");

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    if (!fs.existsSync(uploadDirectory)) {
      fs.mkdirSync(uploadDirectory, { recursive: true });
    }
    cb(null, uploadDirectory);
  },
  filename: function (_req, file, cb) {
    const extension = path.extname(file.originalname || "").toLowerCase() || ".pdf";
    const safeBase = path
      .basename(file.originalname || "document", extension)
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .slice(0, 48);

    cb(null, `${Date.now()}-${safeBase || "document"}${extension}`);
  }
});

function fileFilter(_req, file, cb) {
  const allowedMimeTypes = new Set([
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png"
  ]);

  if (!allowedMimeTypes.has(file.mimetype)) {
    cb(new Error("Only PDF, JPG, and PNG files are allowed"), false);
    return;
  }

  cb(null, true);
}

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});
