// src/services/sentimentService.js
import dotenv from "dotenv";
dotenv.config();

import { CohereClient } from "cohere-ai";
import Sentiment from "sentiment";

const sentimentNpm = new Sentiment();
let cohereClient = null;
if (process.env.COHERE_API_KEY) {
  cohereClient = new CohereClient({ token: process.env.COHERE_API_KEY });
}

/**
 * analyzeSentiment(text)
 * returns: { score: -1..1, label: 'positive'|'neutral'|'negative', raw }
 */
export async function analyzeSentiment(text, options = {}) {
  if (!text) return { score: 0, label: "neutral", raw: null };

  // Prefer LLM-based (Cohere) if key exists
  if (cohereClient) {
    try {
      const prompt = `Classify sentiment of the following text. Return JSON: {"score":<float -1..1>,"label":"positive|neutral|negative","confidence":<0..1>}. Text: ${JSON.stringify(text)}`;
      const resp = await cohereClient.chat({
        model: options.model || "command-r-08-2024",
        message: prompt,
        temperature: 0.0,
      });

      const textOut = resp.text?.trim() || "";
      // Try parse JSON out of response
      let parsed;
      try {
        // attempt to extract JSON
        const j = textOut.match(/\{[\s\S]*\}/);
        parsed = j ? JSON.parse(j[0]) : JSON.parse(textOut);
      } catch (err) {
        // fallback: use regex numbers
      }

      if (parsed && typeof parsed.score === "number") {
        const label = parsed.label || (parsed.score > 0.05 ? "positive" : parsed.score < -0.05 ? "negative" : "neutral");
        return { score: parsed.score, label, raw: parsed };
      }
    } catch (err) {
      console.warn("Cohere sentiment failed, falling back to npm sentiment:", err.message || err);
      // fallthrough to npm sentiment
    }
  }

  // Fallback: npm sentiment
  const res = sentimentNpm.analyze(text);
  // Sentiment returns a 'comparative' score; we normalize to -1..1 roughly
  const comp = res.comparative || 0;
  // clamp to -1..1
  const score = Math.max(-1, Math.min(1, comp));
  const label = score > 0.05 ? "positive" : score < -0.05 ? "negative" : "neutral";
  return { score, label, raw: res };
}
