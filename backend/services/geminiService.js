const { GoogleGenerativeAI } = require("@google/generative-ai");

async function generateJobDescription(data) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing in backend .env");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const configuredModel = process.env.GEMINI_MODEL;
  const modelCandidates = [
    configuredModel,
    "gemini-2.5-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
  ].filter(Boolean);

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

  let lastError = null;
  for (const modelName of modelCandidates) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      if (text && text.trim()) return text;
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(lastError?.message || "Gemini returned an empty response");
}

module.exports = {
  generateJobDescription
};
