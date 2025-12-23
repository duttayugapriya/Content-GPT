// src/models/Insight.js
import mongoose from "mongoose";

const insightSchema = new mongoose.Schema({
  campaign_id: { type: String, required: true, index: true },
  timestamp: { type: Date, default: Date.now, index: true },
  sentiment: {
    score: { type: Number },           // -1 .. +1 (or LLM scale normalized)
    label: { type: String },           // positive/neutral/negative
    details: { type: mongoose.Schema.Types.Mixed }, // raw response
  },
  metrics: {
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    custom: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  alert_sent: { type: Boolean, default: false },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
}, {
  timestamps: true,
});

insightSchema.index({ campaign_id: 1, timestamp: -1 });

const Insight = mongoose.model("Insight", insightSchema);
export default Insight;
