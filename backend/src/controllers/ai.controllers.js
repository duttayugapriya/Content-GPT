// src/controllers/ai.controller.js
import { CohereClient } from "cohere-ai";
import { appendToSheet } from "../utils/sheets.js";
import { sendToSlack } from "../utils/slack.js";
import { optimizePosts } from "../utils/optimizer.js";
import dotenv from "dotenv";
dotenv.config();

const cohere = new CohereClient({ token: process.env.COHERE_API_KEY });
const COHERE_MODEL = process.env.COHERE_MODEL || "command-r-08-2024";

const SHEETS_ENABLED = !!process.env.GOOGLE_SHEETS_ID;
const SLACK_ENABLED  = !!process.env.SLACK_WEBHOOK_URL;

/** Robustly pull the FIRST JSON array from a model response. */
function extractJSONArray(text) {
  if (!text) return null;

  // Remove markdown code fences if present
  let clean = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  // Fast path: exact array
  if (clean.startsWith("[") && clean.endsWith("]")) {
    try { return JSON.parse(clean); } catch {}
  }

  // Fallback: find the first [...] block
  const arrMatch = clean.match(/\[[\s\S]*\]/);
  if (!arrMatch) return null;

  const candidate = arrMatch[0]
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/,\s*([}\]])/g, "$1");

  try { return JSON.parse(candidate); } catch { return null; }
}

/** Validate/sanitize posts array */
function validatePosts(raw) {
  if (!Array.isArray(raw)) throw new Error("Parsed JSON is not an array.");

  return raw.map((item, idx) => {
    if (typeof item !== "object" || item == null) {
      throw new Error(`Item ${idx} is not an object.`);
    }
    const post = String(item.post ?? "").trim();
    if (!post) throw new Error(`Item ${idx} missing "post".`);

    const n = Number(item.score);
    if (Number.isNaN(n)) throw new Error(`Item ${idx} "score" is not numeric.`);

    const score = Math.min(10, Math.max(1, Math.round(n * 10) / 10)); // clamp 1..10, 1 decimal
    return { post, score };
  });
}

/** POST /api/generate */
export async function generateContent(req, res) {
  try {
    const { product_name, target_audience, tone, platform } = req.body;
    if (!product_name || !target_audience || !tone || !platform) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: product_name, target_audience, tone, platform",
      });
    }

    // Optional optimization controls via query/body
    const optimize = (req.query.optimize ?? req.body.optimize) === "true" || (req.query.optimize === true);
    const desiredLength = (req.query.length || req.body.length || "auto"); // "short" | "long" | "auto"
    const returnRaw = (req.query.raw ?? req.body.raw) === "1";

    const prompt = `
You are a creative digital marketing strategist.
Generate 3 short and engaging ${platform} post ideas for a product called "${product_name}".
Tone: ${tone}.
Target audience: ${target_audience}.
For each post:
  1) Write the content.
  2) Briefly consider virality, attention, and audience fit.
  3) Assign a numeric score from 1–10 based on that analysis (do NOT hardcode; scores must vary logically).
Return ONLY valid JSON — an array of objects with keys exactly "post" and "score".
No prose. No markdown fences. No comments. Just JSON.
Example:
[
  {"post": "Post content here", "score": 8.2},
  {"post": "Post content here", "score": 6.9},
  {"post": "Post content here", "score": 9.1}
]
`.trim();

    const response = await cohere.chat({
      model: COHERE_MODEL,
      message: prompt,
      temperature: 0.8,
      // max_tokens: 350, // enable if your SDK supports it
    });

    const text =
      response.text?.trim() ||
      response.output_text?.trim() ||
      response.message?.content?.[0]?.text?.trim();

    if (!text) throw new Error("Empty response from Cohere API");

    const parsed = extractJSONArray(text);
    if (!parsed) {
      return res.status(500).json({
        success: false,
        error: "AI response could not be parsed as JSON.",
        raw: text,
      });
    }

    const posts = validatePosts(parsed);

    // Fire-and-forget integrations
    if (SHEETS_ENABLED || SLACK_ENABLED) {
      await Promise.allSettled(
        posts.map(async (p) => {
          if (SHEETS_ENABLED) await appendToSheet(p.post, p.score, product_name);
          if (SLACK_ENABLED)  await sendToSlack(p.post, p.score);
        })
      );
    }

    if (returnRaw) {
      return res.json({ success: true, data: posts });
    }

    // Optional optimization step
    if (optimize) {
      const optimized = await optimizePosts(posts, {
        platform,
        tone,
        target_audience,
        length: desiredLength, // "short"|"long"|"auto"
      });
      return res.json({ success: true, data: optimized, meta: { optimized: true } });
    }

    return res.json({ success: true, data: posts, meta: { optimized: false } });
  } catch (err) {
    console.error("generateContent error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Generation failed.",
    });
  }
}

