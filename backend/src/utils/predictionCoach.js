// src/utils/predictionCoach.js
// Lightweight "Prediction Coach" that analyzes past A/B tests
// and generates human-readable recommendations. No ML, only
// transparent heuristics over your Campaign collection.

import Campaign from "../models/Campaign.js";

function totalEngagementFromMetrics(metrics = {}) {
  const A = metrics.A || {};
  const B = metrics.B || {};
  const sum = (m) =>
    (m.likes || 0) +
    (m.comments || 0) +
    (m.shares || 0) +
    (m.clicks || 0);

  return {
    A: sum(A),
    B: sum(B),
  };
}

function bucketLength(len) {
  if (len < 80) return "<80";
  if (len < 140) return "80–139";
  if (len < 200) return "140–199";
  return "200+";
}

function initStatsNode() {
  return {
    tests: 0,
    totalWinnerEngagement: 0,
    totalLoserEngagement: 0,
    winners: {
      A: 0,
      B: 0,
      tie: 0,
    },
    avgWinnerLift: 0,
  };
}

function addSample(statsNode, winner, winnerEngagement, loserEngagement) {
  statsNode.tests += 1;
  if (!winner) {
    statsNode.winners.tie += 1;
  } else if (winner === "A") {
    statsNode.winners.A += 1;
  } else if (winner === "B") {
    statsNode.winners.B += 1;
  }
  statsNode.totalWinnerEngagement += winnerEngagement;
  statsNode.totalLoserEngagement += loserEngagement;

  const lift =
    winnerEngagement && loserEngagement
      ? ((winnerEngagement - loserEngagement) / Math.max(loserEngagement, 1)) *
        100
      : 0;

  // incremental running average
  const n = statsNode.tests;
  statsNode.avgWinnerLift =
    ((statsNode.avgWinnerLift * (n - 1)) + lift) / n;
}

/**
 * Global coach summary across all completed campaigns.
 * Returns per-platform / per-tone / per-length-bucket heuristics.
 */
export async function getCoachSummary() {
  const campaigns = await Campaign.find({ status: "completed" }).lean();

  const byPlatform = {};      // platform -> stats
  const byTone = {};          // tone -> stats
  const byLengthBucket = {};  // bucket -> stats

  for (const c of campaigns) {
    const platform = c.platform || "General";
    const tone = (c.tone || "Unknown").trim() || "Unknown";

    const contentA = c.contentA || "";
    const contentB = c.contentB || "";
    const avgLen = (contentA.length + contentB.length) / 2;
    const lenBucket = bucketLength(avgLen);

    const { A: engA, B: engB } = totalEngagementFromMetrics(c.metrics || {});
    let winner = c.winner;
    let winnerEng = 0;
    let loserEng = 0;

    if (!winner || engA === engB) {
      winner = null;
      winnerEng = Math.max(engA, engB);
      loserEng = Math.min(engA, engB);
    } else if (winner === "A") {
      winnerEng = engA;
      loserEng = engB;
    } else if (winner === "B") {
      winnerEng = engB;
      loserEng = engA;
    }

    if (!byPlatform[platform]) byPlatform[platform] = initStatsNode();
    addSample(byPlatform[platform], winner, winnerEng, loserEng);

    if (!byTone[tone]) byTone[tone] = initStatsNode();
    addSample(byTone[tone], winner, winnerEng, loserEng);

    if (!byLengthBucket[lenBucket]) byLengthBucket[lenBucket] = initStatsNode();
    addSample(byLengthBucket[lenBucket], winner, winnerEng, loserEng);
  }

  // derive simple English guidance
  const platformAdvice = Object.entries(byPlatform).map(([platform, s]) => {
    const total = s.tests || 1;
    const aRate = (s.winners.A / total) * 100;
    const bRate = (s.winners.B / total) * 100;

    let recommendation = "No strong winner pattern yet.";
    if (aRate > bRate + 10) {
      recommendation = "Variant A-style copy tends to win more often on this platform.";
    } else if (bRate > aRate + 10) {
      recommendation = "Variant B-style copy tends to win more often on this platform.";
    }

    return {
      platform,
      tests: s.tests,
      win_rate_A: Number(aRate.toFixed(1)),
      win_rate_B: Number(bRate.toFixed(1)),
      avg_winner_lift: Number(s.avgWinnerLift.toFixed(1)),
      recommendation,
    };
  });

  const toneAdvice = Object.entries(byTone).map(([tone, s]) => ({
    tone,
    tests: s.tests,
    win_rate_A: Number(((s.winners.A / (s.tests || 1)) * 100).toFixed(1)),
    win_rate_B: Number(((s.winners.B / (s.tests || 1)) * 100).toFixed(1)),
    avg_winner_lift: Number(s.avgWinnerLift.toFixed(1)),
  }));

  const lengthAdvice = Object.entries(byLengthBucket).map(([bucket, s]) => ({
    length_bucket: bucket,
    tests: s.tests,
    avg_winner_lift: Number(s.avgWinnerLift.toFixed(1)),
  }));

  return {
    total_campaigns: campaigns.length,
    byPlatform: platformAdvice,
    byTone: toneAdvice,
    byLengthBucket: lengthAdvice,
  };
}

/**
 * Campaign-specific coach: explain why this winner likely won
 * + give concrete recommendations for the next test.
 */
export async function getCampaignCoach(campaign_id) {
  const campaign = await Campaign.findOne({ campaign_id }).lean();
  if (!campaign) return null;

  const { A: engA, B: engB } = totalEngagementFromMetrics(campaign.metrics || {});
  const performanceSummary = campaign.performance_insights || campaign.performanceSummary || null;

  const reasons = [];
  const nextSteps = [];

  // 1) Basic winner reasoning
  if (campaign.winner === "A") {
    reasons.push("Variant A generated higher total engagement than Variant B.");
  } else if (campaign.winner === "B") {
    reasons.push("Variant B generated higher total engagement than Variant A.");
  } else {
    reasons.push("This campaign ended in a tie or near-tie on engagement.");
  }

  // 2) Use provided summary if exists
  if (performanceSummary?.engagement_a && performanceSummary?.engagement_b) {
    const ea = performanceSummary.engagement_a;
    const eb = performanceSummary.engagement_b;

    const aMetrics = ea.metrics || {};
    const bMetrics = eb.metrics || {};

    if ((aMetrics.comments || 0) > (bMetrics.comments || 0)) {
      reasons.push("Variant A sparked more conversation (comments).");
    }
    if ((bMetrics.shares || 0) > (aMetrics.shares || 0)) {
      reasons.push("Variant B was shared more frequently.");
    }
    if ((ea.total || 0) !== (eb.total || 0)) {
      reasons.push(
        `Variant ${campaign.winner || "A/B"} showed a lift in total engagement of ` +
        `${performanceSummary.improvement_percentage || 0}%.`
      );
    }
  }

  // 3) Text-level heuristics
  const aLen = (campaign.contentA || "").length;
  const bLen = (campaign.contentB || "").length;
  const avgLen = (aLen + bLen) / 2;
  const lenBucket = bucketLength(avgLen);

  if (lenBucket === "<80") {
    nextSteps.push("Test a slightly longer version (80–140 chars) that explains one clear benefit.");
  } else if (lenBucket === "80–139") {
    nextSteps.push("Length is in a good range; focus next test on CTA clarity or hook strength.");
  } else if (lenBucket === "140–199") {
    nextSteps.push("Try a tighter version 20–40 chars shorter for comparison.");
  } else {
    nextSteps.push("Posts are quite long; run a test with a concise version under 160 chars.");
  }

  // 4) Platform-specific hints
  const p = campaign.platform || "General";
  if (p === "LinkedIn") {
    nextSteps.push("On LinkedIn, lead with a clear problem statement, then a one-line solution.");
  } else if (p === "Instagram") {
    nextSteps.push("On Instagram, emphasize visuals and keep copy punchy with 1–3 relevant hashtags.");
  } else if (p === "Twitter" || p === "X") {
    nextSteps.push("On X/Twitter, keep hooks sharp and experiment with one strong number or proof point.");
  }

  // 5) Tone hints
  const tone = (campaign.tone || "").toLowerCase();
  if (tone.includes("formal") || tone.includes("professional")) {
    nextSteps.push("Consider an alternate test with a slightly warmer, more conversational line.");
  } else if (tone.includes("playful") || tone.includes("fun")) {
    nextSteps.push("Try a more focused, benefit-first variation to balance the playful tone.");
  }

  return {
    campaign_id: campaign.campaign_id,
    platform: campaign.platform || "General",
    tone: campaign.tone || null,
    winner: campaign.winner || null,
    engagement: {
      A: engA,
      B: engB,
    },
    reasons,
    next_steps: nextSteps,
  };
}
