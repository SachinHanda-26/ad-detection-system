'use strict';

/**
 * llmService.js
 *
 * Generates a structured enforcement report from CV detection results using
 * Google Gemini (via LangChain.js @langchain/google-genai).
 * Falls back to a deterministic rule-based report when GEMINI_API_KEY is not
 * set, so the system works fully offline.
 */

const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { ChatPromptTemplate }     = require('@langchain/core/prompts');
const { StringOutputParser }     = require('@langchain/core/output_parsers');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// ── Offline / rule-based fallback ─────────────────────────────────────────────

/**
 * Generate a rule-based report without calling any external API.
 * @param {Array}  detections
 * @param {{ width: number, height: number }} imageInfo
 * @returns {{ summary, legalStatus, recommendation, rawText }}
 */
function ruleBasedReport(detections, imageInfo) {
  const count      = detections.length;
  const classNames = detections.map((d) => d.className || d.class_name || 'unknown');
  const uniqueSet  = [...new Set(classNames)];

  if (count === 0) {
    return {
      summary:        'No street advertisements were detected in the submitted image.',
      legalStatus:    'authorized',
      recommendation: 'No enforcement action required.',
      rawText:        'Offline rule-based assessment: zero detections.',
    };
  }

  const classList = uniqueSet.join(', ');
  const highConf  = detections.filter((d) => d.confidence >= 0.8);
  let legalStatus = 'likely_unauthorized';
  if (highConf.length > 0) legalStatus = 'unauthorized';
  if (count >= 3)           legalStatus = 'unauthorized';

  const summary = `${count} unauthorised advertisement${count > 1 ? 's' : ''} detected (${classList}). ` +
                  `Immediate review is recommended.`;

  const recommendation =
    `Dispatch a field inspector to record, photograph, and remove the identified advertisement${count > 1 ? 's' : ''}. ` +
    `Issue a compliance notice to the responsible party if identifiable.`;

  const rawText =
    `Offline rule-based assessment.\n` +
    `Detections: ${count}\n` +
    `Classes: ${classList}\n` +
    `Image size: ${imageInfo.width}×${imageInfo.height}px\n` +
    `Highest confidence: ${Math.max(...detections.map((d) => d.confidence)).toFixed(2)}`;

  return { summary, legalStatus, recommendation, rawText };
}

// ── LLM-backed report ─────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an urban enforcement assistant analyzing street advertisement violations.
Given detection results from a computer vision model, generate a structured report.
Always respond with ONLY valid JSON (no markdown, no code fences) in this exact format:
{
  "summary": "<1-2 sentence summary>",
  "legalStatus": "unauthorized" | "likely_unauthorized" | "needs_review" | "authorized",
  "recommendation": "<specific action to take>",
  "details": "<paragraph with full explanation>"
}`;

/**
 * Build a human-readable description of the detections for the LLM prompt.
 */
function buildDetectionContext(detections, imageInfo) {
  if (detections.length === 0) {
    return 'No advertisements were detected in this image.';
  }

  const lines = detections.map((d, i) => {
    const name  = d.className || d.class_name || 'unknown';
    const conf  = (d.confidence * 100).toFixed(1);
    const bbox  = d.bbox ? `[${d.bbox.join(', ')}]` : 'unknown';
    return `  ${i + 1}. Class: ${name}, Confidence: ${conf}%, Bounding box: ${bbox}`;
  });

  return (
    `Image dimensions: ${imageInfo.width}×${imageInfo.height}px\n` +
    `Total detections: ${detections.length}\n` +
    `Detected items:\n${lines.join('\n')}`
  );
}

/**
 * Parse the LLM text response to a structured object.
 * Tries JSON.parse first; falls back to rule-based on failure.
 */
function parseLLMResponse(text, detections, imageInfo) {
  // Strip markdown code fences if present (Gemini sometimes wraps output)
  const cleaned = text.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    // Validate required fields
    const validStatuses = ['unauthorized', 'likely_unauthorized', 'needs_review', 'authorized'];
    if (!validStatuses.includes(parsed.legalStatus)) {
      parsed.legalStatus = 'needs_review';
    }
    return {
      summary:        parsed.summary        || '',
      legalStatus:    parsed.legalStatus,
      recommendation: parsed.recommendation || '',
      rawText:        text,
    };
  } catch {
    // Could not parse — fall back to rule-based
    console.warn('[llmService] Failed to parse Gemini JSON response; using rule-based fallback.');
    const fallback = ruleBasedReport(detections, imageInfo);
    fallback.rawText = text; // preserve original text
    return fallback;
  }
}

/**
 * Generate an enforcement report.
 *
 * @param {Array}  detections   Array of detection objects from inference service.
 * @param {{ width: number, height: number }} imageInfo
 * @returns {Promise<{ summary, legalStatus, recommendation, rawText }>}
 */
async function generateReport(detections, imageInfo) {
  // ── Offline mode ───────────────────────────────────────────────────────────
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_key_here') {
    console.info('[llmService] GEMINI_API_KEY not set — using rule-based offline report.');
    return ruleBasedReport(detections, imageInfo);
  }

  // ── LangChain + Gemini ────────────────────────────────────────────────────
  try {
    const model = new ChatGoogleGenerativeAI({
      model:       'gemini-1.5-flash',
      temperature: 0.2,
      maxOutputTokens: 512,
      apiKey:      GEMINI_API_KEY,
    });

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', SYSTEM_PROMPT],
      ['human',  '{context}'],
    ]);

    const chain = prompt.pipe(model).pipe(new StringOutputParser());

    const context   = buildDetectionContext(detections, imageInfo);
    const llmOutput = await chain.invoke({ context });

    return parseLLMResponse(llmOutput, detections, imageInfo);
  } catch (err) {
    console.error('[llmService] Gemini call failed:', err.message);
    // Gracefully fall back so the pipeline never breaks
    const fallback = ruleBasedReport(detections, imageInfo);
    fallback.rawText = `LLM error: ${err.message}\n\n[Fallback report applied]`;
    return fallback;
  }
}

module.exports = { generateReport };
