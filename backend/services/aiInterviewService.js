const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const {
  buildDefaultAIInterviewConfig,
  getInterviewPanelType
} = require("../utils/interviewLifecycle");

const RECOMMENDATIONS = ["STRONG_YES", "YES", "MAYBE", "NO", "STRONG_NO"];
const GROQ_STRICT_SCHEMA_MODELS = new Set(["openai/gpt-oss-20b", "openai/gpt-oss-120b"]);

function logAIInterviewService(event, details = {}) {
  console.info(`[AI-INTERVIEW-SVC] ${event}`, details);
}

function getAIInterviewProvider() {
  const explicitProvider = String(process.env.AI_INTERVIEW_PROVIDER || "").trim().toUpperCase();
  if (["GROQ", "GEMINI"].includes(explicitProvider)) {
    return explicitProvider;
  }

  if (String(process.env.GROQ_API_KEY || "").trim()) {
    return "GROQ";
  }

  if (String(process.env.GEMINI_API_KEY || "").trim()) {
    return "GEMINI";
  }

  throw new Error("Set GROQ_API_KEY or GEMINI_API_KEY for AI interviewer");
}

function isAIInterviewConfigError(error) {
  const message = String(error?.message || error || "").trim();
  return /(GEMINI_API_KEY|GROQ_API_KEY|AI_INTERVIEW_PROVIDER|Set GROQ_API_KEY or GEMINI_API_KEY)/i.test(message);
}

function getGeminiModel() {
  const apiKey = String(process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is required for AI interviewer");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = String(
    process.env.GEMINI_INTERVIEW_MODEL || process.env.GEMINI_MODEL || "gemini-2.5-flash"
  ).trim();
  return genAI.getGenerativeModel({ model: modelName });
}

function getGroqConfig() {
  const apiKey = String(process.env.GROQ_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is required for AI interviewer");
  }

  return {
    apiKey,
    modelName: String(
      process.env.GROQ_INTERVIEW_MODEL || process.env.GROQ_MODEL || "openai/gpt-oss-20b"
    ).trim(),
    endpoint: String(process.env.GROQ_API_URL || "https://api.groq.com/openai/v1/chat/completions").trim()
  };
}

function parseJsonFromText(text) {
  if (!text) return null;

  const raw = String(text).trim();
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function normalizeFocusAreas(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 8);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 8);
  }

  return [];
}

function getAIInterviewConfig(interview = {}) {
  const defaults = buildDefaultAIInterviewConfig();
  const rawConfig = interview?.aiConfig || {};
  const questionCount = Number(rawConfig.questionCount);
  const durationMinutes = Number(rawConfig.durationMinutes);
  const difficulty = String(rawConfig.difficulty || defaults.difficulty).trim().toUpperCase();

  return {
    questionCount: Number.isFinite(questionCount)
      ? Math.min(Math.max(Math.round(questionCount), 3), 10)
      : defaults.questionCount,
    durationMinutes: Number.isFinite(durationMinutes)
      ? Math.min(Math.max(Math.round(durationMinutes), 10), 60)
      : defaults.durationMinutes,
    difficulty: ["EASY", "MEDIUM", "HARD"].includes(difficulty) ? difficulty : defaults.difficulty,
    focusAreas: normalizeFocusAreas(rawConfig.focusAreas)
  };
}

function buildInterviewContext(application) {
  const job = application?.jobId || {};
  const student = application?.studentId || {};
  const user = student?.userId || {};
  const interview = application?.interview || {};
  const config = getAIInterviewConfig(interview);

  return {
    panelType: getInterviewPanelType(interview),
    jobTitle: String(job?.title || "Role").trim(),
    companyName: String(job?.companyName || "Company").trim(),
    jobDescription: String(job?.description || "").trim(),
    aboutCompany: String(job?.aboutCompany || "").trim(),
    studentName: String(user?.name || "Candidate").trim(),
    branch: String(student?.branch || "").trim(),
    year: String(student?.year || "").trim(),
    cgpa: student?.cgpa ?? null,
    skills: Array.isArray(student?.skills) ? student.skills : [],
    resumeSummary: String(student?.resumeSummary || "").trim(),
    assessmentScore: String(application?.assessment?.score || "").trim(),
    assessmentPassed: Boolean(application?.assessment?.passed),
    config
  };
}

function buildFallbackQuestionPlan(context) {
  const focusAreas = context.config.focusAreas.length
    ? context.config.focusAreas
    : ["Introduction", "Technical Knowledge", "Problem Solving", "Role Fit", "Behavioral"];

  const prompts = [
    `Introduce yourself and explain why you are interested in the ${context.jobTitle} role at ${context.companyName}.`,
    `Tell me about a project or experience that best demonstrates your technical ability for this role.`,
    `Walk me through how you would solve a practical problem related to ${context.jobTitle}.`,
    `Which of your skills best match this role, and where do you still want to improve?`,
    `Describe a time you handled a challenge, deadline, or team conflict effectively.`
  ];

  return Array.from({ length: context.config.questionCount }, (_, index) => ({
    id: `q${index + 1}`,
    prompt: prompts[index] || `Question ${index + 1}: Share an example that shows your fit for the ${context.jobTitle} role.`,
    focusArea: focusAreas[index % focusAreas.length] || "General"
  }));
}

function normalizeQuestionPlan(rawPlan, context) {
  const plan = Array.isArray(rawPlan)
    ? rawPlan
    : Array.isArray(rawPlan?.questions)
      ? rawPlan.questions
      : [];

  const normalized = plan
    .map((item, index) => ({
      id: String(item?.id || `q${index + 1}`).trim() || `q${index + 1}`,
      prompt: String(item?.prompt || item?.question || "").trim(),
      focusArea: String(item?.focusArea || item?.skill || "General").trim()
    }))
    .filter((item) => item.prompt)
    .slice(0, context.config.questionCount);

  if (normalized.length) {
    return normalized;
  }

  return buildFallbackQuestionPlan(context);
}

function buildFallbackEvaluation(application) {
  const transcript = Array.isArray(application?.aiInterview?.transcript)
    ? application.aiInterview.transcript
    : [];
  const answered = transcript.filter((item) => String(item?.answer || "").trim()).length;

  return {
    summary: answered
      ? `Candidate completed ${answered} answer(s). Manual recruiter review is recommended.`
      : "Interview ended before meaningful responses were captured.",
    scores: {
      communication: answered ? "3" : "1",
      technicalKnowledge: answered ? "3" : "1",
      problemSolving: answered ? "3" : "1",
      roleFit: answered ? "3" : "1"
    },
    recommendation: answered >= 3 ? "MAYBE" : "NO",
    finalReport: answered
      ? "The AI interviewer generated a fallback evaluation because structured model output could not be parsed."
      : "The interview ended without enough responses to generate an evaluation."
  };
}

function buildQuestionPlanSchema(questionCount) {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      questions: {
        type: "array",
        minItems: questionCount,
        maxItems: questionCount,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            id: { type: "string" },
            prompt: { type: "string" },
            focusArea: { type: "string" }
          },
          required: ["id", "prompt", "focusArea"]
        }
      }
    },
    required: ["questions"]
  };
}

function buildInterviewEvaluationSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      summary: { type: "string" },
      scores: {
        type: "object",
        additionalProperties: false,
        properties: {
          communication: { type: "string", enum: ["1", "2", "3", "4", "5"] },
          technicalKnowledge: { type: "string", enum: ["1", "2", "3", "4", "5"] },
          problemSolving: { type: "string", enum: ["1", "2", "3", "4", "5"] },
          roleFit: { type: "string", enum: ["1", "2", "3", "4", "5"] }
        },
        required: ["communication", "technicalKnowledge", "problemSolving", "roleFit"]
      },
      recommendation: { type: "string", enum: RECOMMENDATIONS },
      finalReport: { type: "string" }
    },
    required: ["summary", "scores", "recommendation", "finalReport"]
  };
}

async function generateGeminiStructuredContent(prompt) {
  const model = getGeminiModel();
  logAIInterviewService("provider.request", {
    provider: "GEMINI",
    promptLength: String(prompt || "").length
  });
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  const parsed = parseJsonFromText(text);
  logAIInterviewService("provider.response", {
    provider: "GEMINI",
    textLength: String(text || "").length,
    parsed: Boolean(parsed)
  });
  return { text, parsed };
}

function getGroqResponseFormat(modelName, schemaName, schema) {
  if (!schemaName || !schema) {
    return { type: "json_object" };
  }

  if (GROQ_STRICT_SCHEMA_MODELS.has(String(modelName || "").trim())) {
    return {
      type: "json_schema",
      json_schema: {
        name: schemaName,
        strict: true,
        schema
      }
    };
  }

  return { type: "json_object" };
}

function extractGroqTextContent(content) {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => String(part?.text || part?.content || "").trim())
      .filter(Boolean)
      .join("\n");
  }

  return "";
}

async function generateGroqStructuredContent({ prompt, schemaName, schema }) {
  const { apiKey, modelName, endpoint } = getGroqConfig();
  logAIInterviewService("provider.request", {
    provider: "GROQ",
    modelName,
    schemaName: schemaName || "",
    promptLength: String(prompt || "").length
  });
  const response = await axios.post(
    endpoint,
    {
      model: modelName,
      temperature: 0.2,
      max_tokens: 1600,
      messages: [
        {
          role: "system",
          content: "You are the TalentX AI interviewer backend. Return only valid JSON. Do not use markdown, code fences, or commentary."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: getGroqResponseFormat(modelName, schemaName, schema)
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      timeout: Number(process.env.AI_INTERVIEW_TIMEOUT_MS || 60000)
    }
  );

  const text = extractGroqTextContent(response?.data?.choices?.[0]?.message?.content);
  const parsed = parseJsonFromText(text);
  logAIInterviewService("provider.response", {
    provider: "GROQ",
    modelName,
    schemaName: schemaName || "",
    textLength: String(text || "").length,
    parsed: Boolean(parsed)
  });
  return { text, parsed };
}

async function generateStructuredContent({ prompt, schemaName, schema }) {
  const provider = getAIInterviewProvider();
  logAIInterviewService("provider.selected", {
    provider,
    schemaName: schemaName || ""
  });

  if (provider === "GROQ") {
    return generateGroqStructuredContent({ prompt, schemaName, schema });
  }

  return generateGeminiStructuredContent(prompt);
}

async function generateInterviewQuestionPlan(application) {
  const context = buildInterviewContext(application);
  const prompt = `
You are an AI technical interviewer for a college placement portal.
Create a structured interview question plan.

Return STRICT JSON only in this shape:
{
  "questions": [
    {
      "id": "q1",
      "prompt": "question text",
      "focusArea": "communication|technical|problem-solving|role-fit|behavioral or custom"
    }
  ]
}

Rules:
- Generate exactly ${context.config.questionCount} questions.
- Difficulty: ${context.config.difficulty}.
- Focus areas: ${context.config.focusAreas.join(", ") || "communication, technical knowledge, problem solving, role fit"}.
- The interview is for job title "${context.jobTitle}" at "${context.companyName}".
- Use the candidate context below, but keep questions concise and interview-like.
- No markdown, no explanation outside JSON.

Candidate context:
- Name: ${context.studentName}
- Branch: ${context.branch || "N/A"}
- Year: ${context.year || "N/A"}
- CGPA: ${context.cgpa ?? "N/A"}
- Skills: ${context.skills.join(", ") || "N/A"}
- Resume summary: ${context.resumeSummary || "N/A"}
- Assessment passed: ${context.assessmentPassed ? "Yes" : "No / Unknown"}
- Assessment score: ${context.assessmentScore || "N/A"}

Job context:
- Description: ${context.jobDescription || "N/A"}
- About company: ${context.aboutCompany || "N/A"}
`;

  try {
    const { parsed } = await generateStructuredContent({
      prompt,
      schemaName: "interview_question_plan",
      schema: buildQuestionPlanSchema(context.config.questionCount)
    });
    return normalizeQuestionPlan(parsed, context);
  } catch (err) {
    if (isAIInterviewConfigError(err)) {
      throw err;
    }
    return buildFallbackQuestionPlan(context);
  }
}

async function evaluateInterview(application) {
  const context = buildInterviewContext(application);
  const questionPlan = Array.isArray(application?.aiInterview?.questionPlan)
    ? application.aiInterview.questionPlan
    : [];
  const transcript = Array.isArray(application?.aiInterview?.transcript)
    ? application.aiInterview.transcript
    : [];

  const transcriptText = transcript
    .map((entry, index) => `Q${index + 1}: ${entry.question}\nA${index + 1}: ${entry.answer}`)
    .join("\n\n");

  const prompt = `
You are an AI interviewer evaluator for a college placement portal.
Evaluate the candidate interview and return STRICT JSON only.

Return JSON in this exact shape:
{
  "summary": "2-4 sentence concise summary",
  "scores": {
    "communication": "1-5",
    "technicalKnowledge": "1-5",
    "problemSolving": "1-5",
    "roleFit": "1-5"
  },
  "recommendation": "STRONG_YES|YES|MAYBE|NO|STRONG_NO",
  "finalReport": "1 paragraph recruiter-facing report"
}

Rules:
- Base the evaluation only on the interview transcript and job context.
- Be fair to students and avoid overclaiming.
- Recommendation is advisory only.
- No markdown and no explanation outside JSON.

Job title: ${context.jobTitle}
Company: ${context.companyName}
Job description: ${context.jobDescription || "N/A"}
Candidate skills: ${context.skills.join(", ") || "N/A"}
Resume summary: ${context.resumeSummary || "N/A"}

Question plan:
${questionPlan.map((item, index) => `${index + 1}. ${item.prompt} [${item.focusArea}]`).join("\n")}

  Transcript:
${transcriptText || "No transcript captured."}
`;

  try {
    const { parsed } = await generateStructuredContent({
      prompt,
      schemaName: "interview_evaluation",
      schema: buildInterviewEvaluationSchema()
    });
    if (!parsed || typeof parsed !== "object") {
      return buildFallbackEvaluation(application);
    }

    const recommendation = String(parsed.recommendation || "").trim().toUpperCase();
    return {
      summary: String(parsed.summary || "").trim(),
      scores: {
        communication: ["1", "2", "3", "4", "5"].includes(String(parsed?.scores?.communication || "")) ? String(parsed.scores.communication) : "3",
        technicalKnowledge: ["1", "2", "3", "4", "5"].includes(String(parsed?.scores?.technicalKnowledge || "")) ? String(parsed.scores.technicalKnowledge) : "3",
        problemSolving: ["1", "2", "3", "4", "5"].includes(String(parsed?.scores?.problemSolving || "")) ? String(parsed.scores.problemSolving) : "3",
        roleFit: ["1", "2", "3", "4", "5"].includes(String(parsed?.scores?.roleFit || "")) ? String(parsed.scores.roleFit) : "3"
      },
      recommendation: RECOMMENDATIONS.includes(recommendation) ? recommendation : "MAYBE",
      finalReport: String(parsed.finalReport || parsed.summary || "").trim()
    };
  } catch (err) {
    if (isAIInterviewConfigError(err)) {
      throw err;
    }
    return buildFallbackEvaluation(application);
  }
}

module.exports = {
  getAIInterviewConfig,
  generateInterviewQuestionPlan,
  evaluateInterview
};
