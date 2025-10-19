import { CohereClient } from "cohere-ai";
import { appendToSheet } from "../utils/sheets.js";
import { sendToSlack } from "../utils/slack.js";
import dotenv from "dotenv";
dotenv.config();

const cohere = new CohereClient({ token: process.env.COHERE_API_KEY });

export async function generateContent(req, res) {
  try {
    const { product_name, target_audience, tone, platform } = req.body;

    if (!product_name || !target_audience || !tone || !platform) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: product_name, target_audience, tone, platform",
      });
    }

    const prompt = `
You are a creative digital marketing strategist.
Generate 3 short and engaging ${platform} post ideas for a product called "${product_name}".
Tone: ${tone}.
Target audience: ${target_audience}.
For each post:
  1. Write the content.
  2. Analyze its engagement potential (virality, likeliness to attract attention, audience appeal).
  3. Assign a numeric score from 1–10 based on your analysis (do NOT hardcode numbers).
Return ONLY valid JSON with keys "post" and "score".
Example:
[
  {"post": "Post content here", "score": 8},
  {"post": "Post content here", "score": 7},
  {"post": "Post content here", "score": 9}
]
Do NOT include extra text outside JSON.
`.trim();

    // 1️⃣ Call Cohere
    const response = await cohere.chat({
      model: "command-r-08-2024",
      message: prompt,
      temperature: 0.8,
    });

    let text =
      response.text?.trim() ||
      response.output_text?.trim() ||
      response.message?.content?.[0]?.text?.trim();

    if (!text) throw new Error("Empty response from Cohere API");

    // 2️⃣ Clean code fences
    text = text.replace(/^```(json)?\n/, "").replace(/```$/, "").trim();

    let posts = [];
    try {
      posts = JSON.parse(text);
      if (!Array.isArray(posts)) throw new Error("Parsed JSON is not an array");
    } catch (parseErr) {
      console.error("JSON parse error:", parseErr);
      return res.status(500).json({
        success: false,
        error: "AI response could not be parsed as JSON.",
        raw: text,
      });
    }

    // 3️⃣ Append to Sheets + Send to Slack
    for (const item of posts) {
      try {
        await appendToSheet(item.post, item.score, product_name);
        await sendToSlack(item.post, item.score);
      } catch (innerErr) {
        console.error("Error saving to Sheets or Slack:", innerErr);
      }
    }

    // 4️⃣ Return posts safely
    res.json({ success: true, data: posts });
  } catch (err) {
    console.error("Cohere API Error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Cohere chat request failed.",
    });
  }
}
