const Application = require("../models/Application");
const User = require("../models/User");
const Job = require("../models/Job");

function sanitizeForSpreadsheet(value) {
  const text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) {
    return `'${text}`;
  }
  return text;
}

function escapeXml(value) {
  return sanitizeForSpreadsheet(value)
    .replace(/\r?\n/g, " ")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function excelCell(value) {
  return `<Cell><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`;
}

function excelRow(values) {
  return `<Row>${values.map(excelCell).join("")}</Row>`;
}

function buildWorkbookXml({ sheetName, headers, rows }) {
  const normalizedSheetName =
    String(sheetName || "Sheet1")
      .replace(/[^A-Za-z0-9 _-]/g, "")
      .slice(0, 31) || "Sheet1";

  const headerRow = excelRow(headers);
  const dataRows = rows.map((row) => excelRow(row)).join("");

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
  <Worksheet ss:Name="${escapeXml(normalizedSheetName)}">
    <Table>
      ${headerRow}
      ${dataRows}
    </Table>
  </Worksheet>
</Workbook>`;
}

function sendWorkbook(res, { fileName, sheetName, headers, rows }) {
  const workbookXml = buildWorkbookXml({ sheetName, headers, rows });
  res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename=${fileName}.xls`);
  res.send(workbookXml);
}

// F12: Export placement data as Excel
exports.exportPlacements = async (req, res) => {
  try {
    const selectedApplications = await Application.find({ status: "SELECTED" })
      .populate({
        path: "studentId",
        populate: { path: "userId", select: "name email" },
      })
      .populate("jobId", "companyName title ctc")
      .sort({ updatedAt: -1 });

    const rows = selectedApplications.map((app) => {
      const name = app.studentId?.userId?.name || "N/A";
      const email = app.studentId?.userId?.email || "N/A";
      const company = app.jobId?.companyName || "N/A";
      const position = app.jobId?.title || "N/A";
      const ctc = app.jobId?.ctc || "N/A";
      const date = app.updatedAt ? new Date(app.updatedAt).toLocaleDateString() : "N/A";
      return [name, email, company, position, ctc, date];
    });

    sendWorkbook(res, {
      fileName: "placements",
      sheetName: "Placements",
      headers: ["Student Name", "Email", "Company", "Position", "CTC (LPA)", "Selected Date"],
      rows,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Export all users
exports.exportUsers = async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: "interviewer" } })
      .select("-password")
      .sort({ createdAt: -1 });

    const rows = users.map((u) => [
      u.name,
      u.email,
      u.role,
      u.isActive,
      u.isApproved,
      new Date(u.createdAt).toLocaleDateString(),
    ]);

    sendWorkbook(res, {
      fileName: "users",
      sheetName: "Users",
      headers: ["Name", "Email", "Role", "Active", "Approved", "Registered"],
      rows,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Export all jobs
exports.exportJobs = async (req, res) => {
  try {
    const jobs = await Job.find()
      .populate("recruiterId", "name email")
      .sort({ createdAt: -1 });

    const rows = jobs.map((j) => [
      j.companyName,
      j.title,
      j.ctc,
      j.minCgpa,
      (j.eligibleBranches || []).join("/"),
      new Date(j.deadline).toLocaleDateString(),
      j.isActive,
      j.recruiterId?.name || "N/A",
    ]);

    sendWorkbook(res, {
      fileName: "jobs",
      sheetName: "Jobs",
      headers: ["Company", "Title", "CTC", "Min CGPA", "Branches", "Deadline", "Active", "Posted By"],
      rows,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
