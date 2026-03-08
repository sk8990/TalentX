const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

module.exports = (application, outputPath) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(outputPath);

    doc.pipe(stream);

    doc.fontSize(22).text("OFFER LETTER", { align: "center" });
    doc.moveDown(2);

    doc.fontSize(12).text(`Date: ${new Date().toDateString()}`);
    doc.moveDown();

    doc.text(`To,`);
    doc.text(application.studentId.userId.name);
    doc.text(application.studentId.userId.email);
    doc.moveDown();

    doc.text(`Subject: Offer of Employment`);
    doc.moveDown();

    doc.text(
      `We are pleased to offer you the position of ${application.jobId.title} at our organization.`
    );

    doc.moveDown();

    doc.text(`Salary: ₹${application.offer.salary} per annum`);
    doc.text(`Joining Date: ${new Date(application.offer.joiningDate).toDateString()}`);
    doc.text(`Location: ${application.offer.location}`);

    doc.moveDown(2);

    doc.text(
      `We look forward to having you on our team. Please confirm your acceptance through the TalentX platform.`
    );

    doc.moveDown(3);
    doc.text("Sincerely,");
    doc.text("HR Department");

    doc.end();

    stream.on("finish", resolve);
    stream.on("error", reject);
  });
};
