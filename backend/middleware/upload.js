const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = "uploads/";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const safeBase = path
      .basename(file.originalname || "resume.pdf", path.extname(file.originalname || ""))
      .replace(/[^a-zA-Z0-9_-]/g, "");
    const uniqueName = `${Date.now()}-${safeBase || "resume"}.pdf`;
    cb(null, uniqueName);
  }
});

// Only allow PDF
const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

module.exports = upload;
