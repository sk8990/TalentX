const fs = require("fs");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const ALLOWED_BRANCHES = ["CS", "IT", "ENTC", "MECH", "CIVIL"];

function getGeminiClient() {
  const apiKey = String(process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing in backend .env");
  }

  return new GoogleGenerativeAI(apiKey);
}

function getModelCandidates() {
  return [
    process.env.GEMINI_MODEL,
    "gemini-2.5-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
  ].filter(Boolean);
}

async function generateContentWithGemini(content) {
  const genAI = getGeminiClient();
  let lastError = null;

  for (const modelName of getModelCandidates()) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(content);
      const response = await result.response;
      const text = response.text();
      if (text && text.trim()) {
        return text.trim();
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(lastError?.message || "Gemini returned an empty response");
}

async function generateTextWithGemini(prompt) {
  return generateContentWithGemini(prompt);
}

function parseJsonFromModelText(text) {
  if (!text) return null;

  const cleaned = String(text).trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeDomain(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split("?")[0]
    .trim();
}

function normalizeBranch(value) {
  const raw = normalizeText(value);
  if (!raw) return null;

  const compact = raw.toUpperCase().replace(/[^A-Z]/g, "");
  if (ALLOWED_BRANCHES.includes(compact)) {
    return compact;
  }

  if (compact.includes("COMPUTERSCIENCE") || compact === "CSE" || compact === "COMPUTERSCIENCEENGINEERING") {
    return "CS";
  }
  if (compact.includes("INFORMATIONTECHNOLOGY")) {
    return "IT";
  }
  if (
    compact.includes("ELECTRONICSANDTELECOMMUNICATION") ||
    compact.includes("ELECTRONICSTELECOMMUNICATION") ||
    compact.includes("ENTC") ||
    compact.includes("ECE")
  ) {
    return "ENTC";
  }
  if (compact.includes("MECHANICAL")) {
    return "MECH";
  }
  if (compact.includes("CIVIL")) {
    return "CIVIL";
  }

  return null;
}

function normalizeBranchList(value) {
  const list = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  return [...new Set(list.map(normalizeBranch).filter(Boolean))];
}

function normalizeOptionalNumber(value, { min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY } = {}) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  if (parsed < min || parsed > max) {
    return null;
  }
  return parsed;
}

function normalizeIsoDate(value) {
  const raw = normalizeText(value);
  if (!raw) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeParsedJobData(raw) {
  const payload = raw && typeof raw === "object" ? raw : {};

  return {
    companyName: normalizeText(payload.companyName),
    companyDomain: normalizeDomain(payload.companyDomain),
    title: normalizeText(payload.title),
    description: normalizeText(payload.description),
    aboutCompany: normalizeText(payload.aboutCompany),
    ctc: normalizeOptionalNumber(payload.ctc, { min: 0.01 }),
    minCgpa: normalizeOptionalNumber(payload.minCgpa, { min: 0, max: 10 }),
    eligibleBranches: normalizeBranchList(payload.eligibleBranches),
    eligibilityText: normalizeText(payload.eligibilityText),
    deadline: normalizeIsoDate(payload.deadline),
  };
}

async function generateJobDescription(data) {
  const prompt = `
You are an HR expert.

Generate a professional job description for:

Job Title: ${data.title}
Experience Level: ${data.experience}
Skills: ${data.skills}

Structure:
- Job Overview
- Key Responsibilities
- Required Skills
- Preferred Qualifications
- Benefits

Keep it professional and clear.
`;

  return generateTextWithGemini(prompt);
}

async function parseJobDescription(data) {
  const jdText = normalizeText(data?.jdText);
  if (!jdText) {
    throw new Error("JD text is required for parsing");
  }

  const prompt = `
You extract structured job posting fields from job descriptions for a campus hiring platform.

Return STRICT JSON only in this exact shape:
{
  "companyName": "string or null",
  "companyDomain": "string or null",
  "title": "string or null",
  "description": "string or null",
  "aboutCompany": "string or null",
  "ctc": "number or null",
  "minCgpa": "number or null",
  "eligibleBranches": ["CS", "IT", "ENTC", "MECH", "CIVIL"],
  "eligibilityText": "string or null",
  "deadline": "YYYY-MM-DD or null"
}

Rules:
- Do not include markdown or explanations.
- Use null for unknown scalar values and [] for unknown branches.
- Only return branches from the allowed list. Map common variants like Computer Science to CS, Information Technology to IT, Electronics and Telecommunication to ENTC, Mechanical to MECH, and Civil to CIVIL.
- "description" should be a clean, student-facing role summary based on the JD.
- "aboutCompany" should contain only company overview details, not role responsibilities.
- "ctc" must be a numeric LPA value when the JD mentions compensation.
- "minCgpa" must be a number between 0 and 10 when explicitly stated.
- "deadline" must be YYYY-MM-DD only when a clear application deadline is present. Otherwise use null.

JD:
"""${jdText}"""
`;

  const text = await generateTextWithGemini(prompt);
  const parsed = parseJsonFromModelText(text);

  if (!parsed) {
    throw new Error("Could not parse structured JSON from model output");
  }

  return normalizeParsedJobData(parsed);
}

async function parseJobDescriptionPdf(file) {
  if (!file?.path) {
    throw new Error("JD PDF file is required for parsing");
  }

  const fileBuffer = fs.readFileSync(file.path);
  const prompt = `
You extract structured job posting fields from uploaded job description PDFs for a campus hiring platform.

Return STRICT JSON only in this exact shape:
{
  "companyName": "string or null",
  "companyDomain": "string or null",
  "title": "string or null",
  "description": "string or null",
  "aboutCompany": "string or null",
  "ctc": "number or null",
  "minCgpa": "number or null",
  "eligibleBranches": ["CS", "IT", "ENTC", "MECH", "CIVIL"],
  "eligibilityText": "string or null",
  "deadline": "YYYY-MM-DD or null"
}

Rules:
- Do not include markdown or explanations.
- Use null for unknown scalar values and [] for unknown branches.
- Only return branches from the allowed list. Map common variants like Computer Science to CS, Information Technology to IT, Electronics and Telecommunication to ENTC, Mechanical to MECH, and Civil to CIVIL.
- "description" should be a clean, student-facing role summary based on the JD.
- "aboutCompany" should contain only company overview details, not role responsibilities.
- "ctc" must be a numeric LPA value when the JD mentions compensation.
- "minCgpa" must be a number between 0 and 10 when explicitly stated.
- "deadline" must be YYYY-MM-DD only when a clear application deadline is present. Otherwise use null.
`;

  const text = await generateContentWithGemini([
    { text: prompt },
    {
      inlineData: {
        mimeType: file.mimetype || "application/pdf",
        data: fileBuffer.toString("base64"),
      },
    },
  ]);

  const parsed = parseJsonFromModelText(text);

  if (!parsed) {
    throw new Error("Could not parse structured JSON from uploaded JD");
  }

  return normalizeParsedJobData(parsed);
}

module.exports = {
  generateJobDescription,
  parseJobDescription,
  parseJobDescriptionPdf,
};
