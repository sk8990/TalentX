const fs = require("fs");
const path = require("path");

function normalizeName(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeName(value) {
  return normalizeName(value)
    .split(" ")
    .filter((token) => token.length >= 2);
}

function titleCaseName(value) {
  return normalizeName(value)
    .split(" ")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function inferNameFromFilename(filePath) {
  const baseName = path.basename(String(filePath || ""), path.extname(String(filePath || "")));
  const withoutTimestamp = baseName.replace(/^\d+[-_]/, "");
  const cleaned = withoutTimestamp
    .replace(/class|marksheet|government|govt|proof|aadhaar|aadhar|pan|passport|id|document|doc|pdf|jpg|jpeg|png/gi, " ")
    .replace(/[-_]+/g, " ");

  return titleCaseName(cleaned);
}

function buildResult({ status, expectedName, detectedName = "", confidence = 0, message }) {
  return {
    status,
    expectedName: String(expectedName || "").trim(),
    detectedName: String(detectedName || "").trim(),
    confidence: Math.max(0, Math.min(1, Number(confidence) || 0)),
    message
  };
}

function readMockVerification({ expectedName, filePath }) {
  const mode = String(process.env.DOCUMENT_VERIFICATION_MODE || "").trim().toLowerCase();
  const fileName = path.basename(String(filePath || "")).toLowerCase();

  if (mode !== "mock") {
    return null;
  }

  if (fileName.includes("mock-failed")) {
    return buildResult({
      status: "failed",
      expectedName,
      confidence: 0,
      message: "Mock verification failed for this document."
    });
  }

  if (fileName.includes("mock-mismatch")) {
    return buildResult({
      status: "name_mismatch",
      expectedName,
      detectedName: "Different Candidate",
      confidence: 0.78,
      message: "The detected name does not match the Letter of Intent candidate name."
    });
  }

  if (fileName.includes("mock-verified")) {
    return buildResult({
      status: "verified",
      expectedName,
      detectedName: expectedName,
      confidence: 0.92,
      message: "Document name matched successfully."
    });
  }

  return null;
}

async function verifyDocumentName({
  filePath,
  expectedName,
  documentType
}) {
  const safeExpectedName = String(expectedName || "").trim();

  try {
    if (!filePath || !fs.existsSync(filePath)) {
      return buildResult({
        status: "failed",
        expectedName: safeExpectedName,
        confidence: 0,
        message: "Uploaded file could not be found for verification."
      });
    }

    if (!safeExpectedName) {
      return buildResult({
        status: "manual_review",
        expectedName: safeExpectedName,
        confidence: 0,
        message: "Candidate name was unavailable, so this document was sent for manual review."
      });
    }

    const mockResult = readMockVerification({ expectedName: safeExpectedName, filePath });
    if (mockResult) {
      return mockResult;
    }

    const expectedTokens = tokenizeName(safeExpectedName);
    const inferredName = inferNameFromFilename(filePath);
    const inferredTokens = tokenizeName(inferredName);
    const source = normalizeName(`${inferredName} ${path.basename(filePath)}`);
    const matchedTokens = expectedTokens.filter((token) => source.includes(token));
    const matchRatio = expectedTokens.length ? matchedTokens.length / expectedTokens.length : 0;

    if (expectedTokens.length > 0 && matchRatio === 1) {
      return buildResult({
        status: "verified",
        expectedName: safeExpectedName,
        detectedName: safeExpectedName,
        confidence: 0.84,
        message: `${documentType || "Document"} name matched the Letter of Intent candidate name.`
      });
    }

    if (source.includes("mismatch") || source.includes("wrong name")) {
      return buildResult({
        status: "name_mismatch",
        expectedName: safeExpectedName,
        detectedName: inferredName || "Unknown",
        confidence: 0.72,
        message: "The detected name does not match the Letter of Intent candidate name."
      });
    }

    if (matchedTokens.length > 0 || inferredTokens.length > 0) {
      return buildResult({
        status: "manual_review",
        expectedName: safeExpectedName,
        detectedName: inferredName,
        confidence: Math.max(0.25, Math.min(0.55, matchRatio)),
        message: "AI/OCR extraction is not fully available, so this document was sent for manual review."
      });
    }

    return buildResult({
      status: "manual_review",
      expectedName: safeExpectedName,
      confidence: 0.2,
      message: "AI/OCR extraction is unavailable. The document was uploaded and sent for manual review."
    });
  } catch (_err) {
    return buildResult({
      status: "manual_review",
      expectedName: safeExpectedName,
      confidence: 0,
      message: "Document verification is temporarily unavailable. The upload was retained for manual review."
    });
  }
}

module.exports = {
  verifyDocumentName
};
