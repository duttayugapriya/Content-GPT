// src/routes/insights.routes.js
import { Router } from "express";
import Insight from "../models/Insights.js";
import Campaign from "../models/Campaign.js";
import { analyzeSentiment } from "../utils/sentimentService.js";
import { sendAlertToSlack } from "../utils/slack.js";
import { appendRowToSheet } from "../utils/sheets.js";

const router = Router();

/**
 * POST /api/insights/analyze
 * Body: { campaign_id, text, metrics? }
 * -> runs sentiment analysis, saves an Insight entry, optionally triggers alerts
 */
router.post("/analyze", async (req, res) => {
  try {
    const { campaign_id, text, metrics = {} } = req.body;
    if (!campaign_id || !text) return res.status(400).json({ success: false, error: "campaign_id and text are required" });

    const sentiment = await analyzeSentiment(text);
    const insight = new Insight({
      campaign_id,
      sentiment: { ...sentiment },
      metrics,
      meta: { source: "manual" },
    });
    await insight.save();

    // Optional: append to sheet (detailed content metrics)
    try {
      await appendRowToSheet("content_metrics", [
        new Date().toLocaleString(),
        campaign_id,
        metrics.content_type || "",
        metrics.tone || "",
        metrics.keywords ? metrics.keywords.join(", ") : "",
        metrics.original_content || text,
        metrics.optimized_content || "",
        JSON.stringify({ sentiment, metrics }),
      ]);
    } catch (err) {
      console.warn("Failed to append to sheet:", err.message || err);
    }

    // Check for alert thresholds (configurable)
    if (sentiment.score <= -0.6) {
      // Severe negative sentiment: alert Slack
      await sendAlertToSlack({
        campaign_id,
        severity: "critical",
        message: `Highly negative sentiment detected (score=${sentiment.score}).`,
        payload: { label: sentiment.label, score: sentiment.score },
      });
      insight.alert_sent = true;
      await insight.save();
    } else if (sentiment.score <= -0.3) {
      await sendAlertToSlack({
        campaign_id,
        severity: "warning",
        message: `Negative sentiment observed (score=${sentiment.score}).`,
        payload: { label: sentiment.label, score: sentiment.score },
      });
      insight.alert_sent = true;
      await insight.save();
    }

    return res.json({ success: true, data: insight });
  } catch (err) {
    console.error("Error in /analyze:", err);
    return res.status(500).json({ success: false, error: err.message || err });
  }
});

/**
 * POST /api/insights/track
 * Post periodic performance metrics (likes, comments...) that will be stored and aggregated.
 * Body: { campaign_id, metrics: { likes, comments, shares, views, clicks, ... }, text? }
 */
router.post("/track", async (req, res) => {
  try {
    const { campaign_id, metrics = {}, text = "" } = req.body;
    if (!campaign_id) return res.status(400).json({ success: false, error: "campaign_id required" });

    const sentiment = text ? await analyzeSentiment(text) : { score: 0, label: "neutral", raw: null };

    const insight = new Insight({
      campaign_id,
      sentiment,
      metrics,
      meta: { source: "tracker" }
    });

    await insight.save();

    // optional sheet append
    try {
      await appendRowToSheet("content_metrics", [
        new Date().toLocaleString(),
        campaign_id,
        metrics.content_type || "",
        metrics.tone || "",
        metrics.keywords ? metrics.keywords.join(", ") : "",
        metrics.original_content || text,
        metrics.optimized_content || "",
        JSON.stringify({ sentiment, metrics }),
      ]);
    } catch (err) {
      console.warn("append to sheet failed:", err.message || err);
    }

    return res.json({ success: true, data: insight });
  } catch (err) {
    console.error("Error in /track:", err);
    return res.status(500).json({ success: false, error: err.message || err });
  }
});

/**
 * GET /api/insights/report/:campaign_id
 * Returns aggregated performance + sentiment summary for the campaign
 */
router.get("/report/:campaign_id", async (req, res) => {
  try {
    const { campaign_id } = req.params;
    if (!campaign_id) return res.status(400).json({ success: false, error: "campaign_id required" });

    const insights = await Insight.find({ campaign_id }).sort({ timestamp: -1 }).limit(500).lean();

    // Aggregate
    const total = insights.length;
    const avgSentiment = insights.reduce((s, it) => s + (it.sentiment?.score || 0), 0) / (total || 1);
    const latest = insights[0] || null;
    const last24h = await Insight.find({
      campaign_id,
      timestamp: { $gte: new Date(Date.now() - 24 * 3600 * 1000) }
    }).lean();

    // quick engagement totals (latest only)
    const latestMetrics = latest?.metrics || {};
    const summary = {
      total_snapshots: total,
      avg_sentiment: Number(avgSentiment.toFixed(3)),
      latest_sentiment: latest?.sentiment || null,
      last24h_count: last24h.length,
      latest_metrics: latestMetrics,
      trend: (avgSentiment > 0.1) ? "up" : (avgSentiment < -0.1 ? "down" : "stable")
    };

    return res.json({ success: true, data: { insights, summary }});
  } catch (err) {
    console.error("Error in /report:", err);
    return res.status(500).json({ success: false, error: err.message || err });
  }
});

export default router;
