const axios = require("axios");
const { generateTextWithGemini, parseJsonFromModelText } = require("../geminiService");

function normalizeText(value) {
  return String(value || "").trim();
}

function buildCompanyTokens(companyName) {
  return normalizeText(companyName)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3);
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtmlTags(value) {
  return decodeHtmlEntities(String(value || "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function normalizeYouTubeEmbed(url) {
  const raw = normalizeText(url);
  if (!raw) {
    return "";
  }

  try {
    const parsed = new URL(raw);

    if (parsed.hostname.includes("youtu.be")) {
      const videoId = parsed.pathname.replace(/^\/+/, "").split("/")[0];
      return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : "";
    }

    if (parsed.hostname.includes("youtube.com")) {
      if (parsed.pathname.startsWith("/embed/")) {
        const videoId = parsed.pathname.split("/").pop();
        return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : "";
      }

      const videoId = parsed.searchParams.get("v");
      return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : "";
    }
  } catch (_err) {
    return "";
  }

  return "";
}

function buildTaskSpecificSections({ taskKey, companyName, roleLabel }) {
  if (taskKey === "companyPolicies") {
    return [
      {
        heading: "Workplace Expectations",
        body: `As you join ${companyName} in ${roleLabel}, expect policies around attendance, hybrid or in-office routines, working hours, leave planning, expense handling, and respectful communication across teams.`
      },
      {
        heading: "Benefits And Support",
        body: `New hires at ${companyName} are typically introduced to benefits enrollment, manager support channels, IT help resources, and the internal handbook during the first phase of onboarding. Confirm exact eligibility timelines and enrollment windows with HR.`
      },
      {
        heading: "How To Stay Aligned",
        body: "Review the handbook, ask questions early, and use official HR communications as the final source of truth whenever a local process, reimbursement rule, or leave policy is unclear."
      }
    ];
  }

  if (taskKey === "codeOfConduct") {
    return [
      {
        heading: "Professional Standards",
        body: `${companyName} will expect you to communicate respectfully, collaborate responsibly, and represent the organization professionally in meetings, online systems, and any customer-facing or campus-facing context.`
      },
      {
        heading: "Ethics And Integrity",
        body: "You should avoid conflicts of interest, misuse of company assets, harassment, discrimination, or any behavior that could compromise trust, fairness, or workplace safety."
      },
      {
        heading: "Escalation Path",
        body: "If you notice conduct concerns, policy breaches, or uncomfortable situations, raise them through your manager, HR contact, or the official reporting channel documented by the employer."
      }
    ];
  }

  if (taskKey === "dataPrivacy") {
    return [
      {
        heading: "Handling Personal And Company Data",
        body: `In your role as ${roleLabel}, you may work with internal tools, candidate data, employee records, or business information. Only access what you need, use approved systems, and avoid storing work data in personal apps or devices unless explicitly allowed.`
      },
      {
        heading: "Security Hygiene",
        body: `Expect ${companyName} to require secure passwords, MFA, device lock habits, phishing awareness, and timely reporting of suspicious links, file requests, or access issues.`
      },
      {
        heading: "Confidentiality Mindset",
        body: "Treat internal documents, source material, business plans, and personally identifiable information as confidential. When in doubt, pause and confirm the correct sharing process before forwarding or downloading anything sensitive."
      }
    ];
  }

  if (taskKey === "trainingOverview") {
    return [
      {
        heading: "Your First Learning Milestones",
        body: `${companyName} will usually onboard campus hires through a structured mix of orientation sessions, tool setup, role context, compliance reading, and manager-led introductions for ${roleLabel}.`
      },
      {
        heading: "What To Complete Early",
        body: "Focus on the welcome materials, access provisioning steps, team introductions, communication tooling, and any mandatory compliance or security modules assigned before day one or during the first week."
      },
      {
        heading: "How To Use The Welcome Video",
        body: "The video section is intended to give you cultural and workplace context. If a company-specific video is unavailable, use the rest of the onboarding tasks and official recruiter guidance as your primary preparation source."
      }
    ];
  }

  return [
    {
      heading: "What This Covers",
      body: `${taskKey} explains the expectations, routines, and good practices that help you start confidently within ${companyName}'s workplace environment.`
    },
    {
      heading: "How To Use It",
      body: "Treat this as a preparation guide. Your final source of truth should still be the signed offer documents, company handbook, and your HR onboarding pack."
    },
    {
      heading: "What You Should Remember",
      body: `Focus on collaboration, professional conduct, responsible use of company systems, and being proactive about asking for clarity when a process is specific to ${companyName}.`
    }
  ];
}

function buildFallbackTaskContent({ task, companyName, companyDomain, jobTitle }) {
  const roleLabel = normalizeText(jobTitle) || "your role";
  const companyLabel = normalizeText(companyName) || "the company";
  const domainLabel = normalizeText(companyDomain);
  const introTail = domainLabel
    ? `${companyLabel} is associated with ${domainLabel}, so use this brief as company-aware guidance and confirm any exact policy wording with HR.`
    : `Use this brief as company-aware guidance and confirm any exact policy wording with HR.`;

  return {
    title: `${task.title} at ${companyLabel}`,
    intro: `This orientation brief is tailored for a new campus hire joining ${companyLabel} as ${roleLabel}. ${introTail}`,
    estimatedReadMinutes: 4,
    sections: buildTaskSpecificSections({
      taskKey: task?.key,
      companyName: companyLabel,
      roleLabel
    }),
    keyTakeaways: [
      `Understand how ${companyLabel} expects new hires to work and communicate.`,
      "Review the handbook or HR guidance for any legally binding policy terms.",
      "Clarify anything role-specific with your onboarding manager before day one."
    ],
    acknowledgement:
      "I have reviewed this orientation guide and I understand that official company documents and HR communications remain the final source of truth."
  };
}

async function generateTaskReading({ companyName, companyDomain, jobTitle, task }) {
  const prompt = `
You create onboarding reading material for a campus-hiring platform.

Generate a student-friendly, company-aware orientation brief for a new hire joining:
- Company: ${companyName}
- Company Domain: ${companyDomain || "Unknown"}
- Role: ${jobTitle || "Not specified"}
- Topic: ${task.title}
- Topic Description: ${task.description}

Return STRICT JSON only in this exact shape:
{
  "title": "string",
  "intro": "string",
  "estimatedReadMinutes": 4,
  "sections": [
    { "heading": "string", "body": "string" }
  ],
  "keyTakeaways": ["string"],
  "acknowledgement": "string"
}

Rules:
- Do not include markdown fences.
- Tailor the tone to the company and topic, but avoid inventing precise legal clauses, compensation details, or confidential internal facts.
- If a company-specific detail is not reliably knowable, phrase it as guidance using wording like "typically", "expect", or "confirm with HR".
- Keep it practical and onboarding-oriented for a campus hire.
- Produce 3 to 4 sections and 3 to 5 key takeaways.
`;

  try {
    const text = await generateTextWithGemini(prompt);
    const parsed = parseJsonFromModelText(text);

    if (parsed?.title && Array.isArray(parsed?.sections) && parsed.sections.length > 0) {
      return {
        title: normalizeText(parsed.title),
        intro: normalizeText(parsed.intro),
        estimatedReadMinutes: Number(parsed.estimatedReadMinutes) > 0 ? Number(parsed.estimatedReadMinutes) : 4,
        sections: parsed.sections
          .map((section) => ({
            heading: normalizeText(section?.heading),
            body: normalizeText(section?.body)
          }))
          .filter((section) => section.heading && section.body),
        keyTakeaways: Array.isArray(parsed.keyTakeaways)
          ? parsed.keyTakeaways.map((item) => normalizeText(item)).filter(Boolean)
          : [],
        acknowledgement: normalizeText(parsed.acknowledgement)
      };
    }
  } catch (_err) {
    // Fall through to deterministic fallback.
  }

  return buildFallbackTaskContent({ task, companyName, companyDomain, jobTitle });
}

function buildVideoSearchQueries({ companyName, companyDomain }) {
  const queries = [
    `"${companyName}" campus tour site:youtube.com`,
    `"${companyName}" office tour site:youtube.com`,
    `"${companyName}" welcome video site:youtube.com`,
    `"${companyName}" company culture site:youtube.com`,
    `"${companyName}" induction site:youtube.com`
  ];

  if (companyDomain) {
    queries.unshift(`"${companyName}" "${companyDomain}" campus tour site:youtube.com`);
  }

  return [...new Set(queries)];
}

function buildVideoSearchPlanFallback(context) {
  return {
    queries: buildVideoSearchQueries(context)
  };
}

async function generateVideoSearchPlan(context) {
  const prompt = `
You are helping an onboarding assistant find a public company introduction or campus tour video.

Company: ${context.companyName}
Company Domain: ${context.companyDomain || "Unknown"}
Role: ${context.jobTitle || "Not specified"}

Return STRICT JSON only:
{
  "queries": ["string"]
}

Rules:
- Generate 4 to 6 concise web search queries.
- Prioritize public YouTube results for campus tour, office tour, welcome video, culture video, or induction video.
- Keep the company name exact in the query.
- Do not include explanations.
`;

  try {
    const text = await generateTextWithGemini(prompt);
    const parsed = parseJsonFromModelText(text);
    const queries = Array.isArray(parsed?.queries)
      ? parsed.queries.map((item) => normalizeText(item)).filter(Boolean)
      : [];

    if (queries.length > 0) {
      return { queries: [...new Set(queries)] };
    }
  } catch (_err) {
    // Fall through to deterministic fallback.
  }

  return buildVideoSearchPlanFallback(context);
}

async function searchDuckDuckGo(query) {
  const response = await axios.get("https://html.duckduckgo.com/html/", {
    params: { q: query },
    timeout: 12000,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36"
    }
  });

  const html = String(response.data || "");
  const regex = /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  const matches = [];
  let match = regex.exec(html);

  while (match) {
    const href = decodeHtmlEntities(match[1]);
    const title = stripHtmlTags(match[2]);

    try {
      const redirectUrl = new URL(href, "https://duckduckgo.com");
      const decodedUrl = redirectUrl.searchParams.get("uddg")
        ? decodeURIComponent(redirectUrl.searchParams.get("uddg"))
        : redirectUrl.href;

      matches.push({
        title,
        url: decodedUrl
      });
    } catch (_err) {
      matches.push({
        title,
        url: href
      });
    }

    match = regex.exec(html);
  }

  return matches;
}

function scoreVideoCandidate(candidate, context) {
  const combined = `${candidate.title} ${candidate.url}`.toLowerCase();
  const companyTokens = buildCompanyTokens(context.companyName);
  const positiveKeywords = ["campus", "office", "tour", "welcome", "culture", "life at", "induction", "onboarding", "workspace"];
  const negativeKeywords = ["music", "song", "lyrics", "trailer", "reaction", "interview questions", "astley", "remix", "live concert", "mashup"];

  if (!candidate.embedUrl) {
    return -100;
  }

  if (!companyTokens.some((token) => combined.includes(token))) {
    return -50;
  }

  let score = 0;
  for (const token of companyTokens) {
    if (combined.includes(token)) {
      score += 15;
    }
  }

  for (const keyword of positiveKeywords) {
    if (combined.includes(keyword)) {
      score += 12;
    }
  }

  for (const keyword of negativeKeywords) {
    if (combined.includes(keyword)) {
      score -= 40;
    }
  }

  if (combined.includes("official")) {
    score += 10;
  }

  return score;
}

async function discoverCompanyWelcomeVideo(context) {
  const searchPlan = await generateVideoSearchPlan(context);
  const candidates = [];

  for (const query of searchPlan.queries.slice(0, 6)) {
    try {
      const results = await searchDuckDuckGo(query);

      for (const result of results.slice(0, 8)) {
        const embedUrl = normalizeYouTubeEmbed(result.url);
        if (!embedUrl) {
          continue;
        }

        candidates.push({
          title: result.title,
          sourceUrl: result.url,
          embedUrl,
          query,
          score: scoreVideoCandidate({ ...result, embedUrl }, context)
        });
      }
    } catch (_err) {
      // Ignore individual query failures and continue.
    }
  }

  const ranked = candidates
    .filter((item) => item.score >= 25)
    .sort((left, right) => right.score - left.score);

  if (ranked.length > 0) {
    const winner = ranked[0];
    return {
      title: winner.title || `${context.companyName} Welcome Video`,
      description: `Public company introduction, culture clip, or campus tour discovered for ${context.companyName}.`,
      embedUrl: winner.embedUrl,
      sourceUrl: winner.sourceUrl,
      sourceQuery: winner.query,
      provider: "youtube",
      isFallback: false
    };
  }

  return buildFallbackVideoAsset({
    ...context,
    sourceQuery: searchPlan.queries?.[0] || ""
  });
}

function buildFallbackVideoAsset(context) {
  const primaryQuery = buildVideoSearchQueries(context)[0] || `${context.companyName} welcome video`;
  return {
    title: `${context.companyName} Welcome Video`,
    description: `A verified public welcome or campus tour video could not be matched confidently for ${context.companyName} right now. You can still continue with the required reading and use the search link below to explore public company videos manually.`,
    embedUrl: "",
    sourceUrl: "",
    sourceQuery: context.sourceQuery || primaryQuery,
    searchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(primaryQuery)}`,
    provider: "none",
    isFallback: true
  };
}

function buildLocationSearchQueries({ companyName, companyDomain }) {
  const queries = [
    `${companyName} office`,
    `${companyName} headquarters`,
    `${companyName} branch office`
  ];

  if (companyDomain) {
    queries.unshift(`${companyName} ${companyDomain} office`);
  }

  return [...new Set(queries)];
}

async function searchNominatim(query) {
  const response = await axios.get("https://nominatim.openstreetmap.org/search", {
    params: {
      q: query,
      format: "jsonv2",
      addressdetails: 1,
      limit: 25
    },
    timeout: 15000,
    headers: {
      "User-Agent": "TalentX-Onboarding/1.0",
      "Accept-Language": "en"
    }
  });

  return Array.isArray(response.data) ? response.data : [];
}

function mapNominatimLocation(item) {
  const address = item?.address || {};
  const country = normalizeText(address.country);
  const countryCode = normalizeText(address.country_code).toUpperCase();
  const city = normalizeText(
    address.city
      || address.town
      || address.village
      || address.municipality
      || address.county
      || address.state_district
      || address.state
  );

  const displayName = normalizeText(item?.display_name);
  const officeName = normalizeText(item?.name) || normalizeText(displayName.split(",")[0]) || "Office";

  return {
    officeName,
    city,
    country,
    countryCode,
    address: displayName,
    latitude: Number(item?.lat),
    longitude: Number(item?.lon),
    sourceUrl: `https://www.openstreetmap.org/?mlat=${item?.lat}&mlon=${item?.lon}#map=14/${item?.lat}/${item?.lon}`,
    importance: Number(item?.importance || 0)
  };
}

function buildFallbackLocations(context) {
  return {
    title: `${context.companyName} Global Locations`,
    intro: `Live office location data is not available right now for ${context.companyName}. You can still search by country once locations are discovered in later refreshes.`,
    locations: [],
    source: "nominatim-fallback"
  };
}

async function discoverCompanyLocations(context) {
  const queries = buildLocationSearchQueries(context).slice(0, 4);
  const companyTokens = buildCompanyTokens(context.companyName);
  const strictMatches = [];
  const relaxedMatches = [];

  for (const query of queries) {
    try {
      const results = await searchNominatim(query);

      for (const item of results) {
        const haystack = `${item?.display_name || ""} ${item?.name || ""}`.toLowerCase();
        const location = mapNominatimLocation(item);
        if (!location.country && !location.city && !location.address) {
          continue;
        }

        if (companyTokens.length > 0 && companyTokens.some((token) => haystack.includes(token))) {
          strictMatches.push(location);
        } else {
          relaxedMatches.push(location);
        }
      }
    } catch (_err) {
      // Continue with remaining queries.
    }
  }

  const collected = strictMatches.length > 0 ? strictMatches : relaxedMatches;

  if (!collected.length) {
    return buildFallbackLocations(context);
  }

  const dedupedMap = new Map();
  for (const location of collected) {
    const key = `${location.officeName}|${location.city}|${location.country}`.toLowerCase();
    const current = dedupedMap.get(key);
    if (!current || location.importance > current.importance) {
      dedupedMap.set(key, location);
    }
  }

  const locations = [...dedupedMap.values()]
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 60)
    .map(({ importance, ...rest }) => rest);

  return {
    title: `${context.companyName} Global Locations`,
    intro: `Explore office and branch locations discovered for ${context.companyName}. Use country filtering and search to quickly narrow your view.`,
    locations,
    source: strictMatches.length > 0 ? "openstreetmap-nominatim" : "openstreetmap-nominatim-relaxed"
  };
}

module.exports = {
  buildFallbackTaskContent,
  buildFallbackVideoAsset,
  discoverCompanyLocations,
  discoverCompanyWelcomeVideo,
  generateTaskReading
};
