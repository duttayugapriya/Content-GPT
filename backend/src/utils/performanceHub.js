// src/utils/performanceHub.js
import Insight from "../models/Insight.js";

/**
 * aggregateCampaign(campaign_id, { windowDays })
 * returns aggregated stats
 */
export async function aggregateCampaign(campaign_id, options = {}) {
  const windowDays = options.windowDays || 7;
  const since = new Date(Date.now() - windowDays * 24 * 3600 * 1000);

  const pipeline = [
    { $match: { campaign_id, timestamp: { $gte: since } } },
    {
      $group: {
        _id: "$campaign_id",
        snapshots: { $sum: 1 },
        avgSentiment: { $avg: "$sentiment.score" },
        maxSentiment: { $max: "$sentiment.score" },
        minSentiment: { $min: "$sentiment.score" },
        likes: { $sum: "$metrics.likes" },
        comments: { $sum: "$metrics.comments" },
        shares: { $sum: "$metrics.shares" },
        views: { $sum: "$metrics.views" },
        clicks: { $sum: "$metrics.clicks" },
      },
    },
  ];

  const result = await Insight.aggregate(pipeline);
  return result[0] || {
    campaign_id,
    snapshots: 0,
    avgSentiment: 0,
    maxSentiment: 0,
    minSentiment: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    views: 0,
    clicks: 0,
  };
}
