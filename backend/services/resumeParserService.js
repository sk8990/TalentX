const fs = require("fs");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { normalizeList, normalizeText } = require("../utils/jobMatch");

const BRANCHES = ["CS", "IT", "ENTC", "MECH", "CIVIL"];

function normalizeBranch(branch) {
  const raw = normalizeText(branch).toUpperCase();
  return BRANCHES.includes(raw) ? raw : null;
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

function normalizeResumeData(raw) {
  const payload = raw && typeof raw === "object" ? raw : {};
  const cgpa = Number(payload.cgpa);
  const minCtc = Number(payload.minCtc);

  return {
    branch: normalizeBranch(payload.branch),
    year: payload.year ? String(payload.year).trim() : null,
    cgpa: Number.isFinite(cgpa) && cgpa >= 0 && cgpa <= 10 ? cgpa : null,
    skills: normalizeList(payload.skills).slice(0, 25),
    preferredRoles: normalizeList(payload.preferredRoles).slice(0, 10),
    preferredLocations: normalizeList(payload.preferredLocations).slice(0, 10),
    minCtc: Number.isFinite(minCtc) && minCtc >= 0 ? minCtc : null,
    summary: payload.summary ? String(payload.summary).trim() : ""
  };
}

async function parseResumePdf(filePath) {
  const apiKey = String(process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is required for resume parsing");
  }

  const fileBuffer = fs.readFileSync(filePath);
  const modelName = String(process.env.GEMINI_MODEL || "gemini-2.5-flash").trim();
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  const prompt = `
Extract structured placement profile data from this resume PDF.
Return STRICT JSON only with keys:
{
  "branch": "CS|IT|ENTC|MECH|CIVIL|null",
  "year": "string or null",
  "cgpa": "number or null",
  "skills": ["string"],
  "preferredRoles": ["string"],
  "preferredLocations": ["string"],
  "minCtc": "number or null",
  "summary": "short one-line summary"
}
Rules:
- Do not include markdown.
- Use null for unknown values.
- Keep skills concise and practical.
- preferredRoles and preferredLocations may be empty arrays.
`;

  const result = await model.generateContent([
    { text: prompt },
    {
      inlineData: {
        mimeType: "application/pdf",
        data: fileBuffer.toString("base64")
      }
    }
  ]);

  const response = await result.response;
  const parsed = parseJsonFromModelText(response.text());

  if (!parsed) {
    throw new Error("Could not parse structured JSON from model output");
  }

  return normalizeResumeData(parsed);
}

module.exports = {
  parseResumePdf
};
