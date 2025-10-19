import { Router } from "express";
import Campaign from "../models/Campaign.js";
import {
  generateAIFeedback,
  simulateEngagementMetrics,
} from "../utils/feedbackGenerator.js";
import { appendToSheet } from "../utils/sheets.js";

const router = Router();

/**
 * POST /api/abtest/start
 * Start a new A/B test campaign
 */
router.route("/start").post(async (req, res) => {
  try {
    const {
      contentA,
      contentB,
      platform = "General",
      target_audience,
      tone,
    } = req.body;

    // Validate required fields
    if (!contentA || !contentB) {
      return res.status(400).json({
        success: false,
        error: "Both contentA and contentB are required",
      });
    }

    // Generate unique campaign ID
    const campaign_id = Campaign.generateCampaignId();

    // Create new campaign
    const campaign = new Campaign({
      campaign_id,
      contentA: contentA.trim(),
      contentB: contentB.trim(),
      platform,
      target_audience: target_audience || null,
      tone: tone || null,
      status: "active",
    });

    await campaign.save();

    // Log to console for debugging
    console.log(`A/B Test started: ${campaign_id}`);
    console.log(`Content A: ${contentA.substring(0, 100)}...`);
    console.log(`Content B: ${contentB.substring(0, 100)}...`);

    res.status(201).json({
      success: true,
      message: "A/B test campaign started successfully",
      data: {
        campaign_id: campaign.campaign_id,
        status: campaign.status,
        created_at: campaign.created_at,
        platform: campaign.platform,
      },
    });
  } catch (error) {
    console.error("Error starting A/B test:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to start A/B test campaign",
    });
  }
});

/**
 * POST /api/abtest/update
 * Update engagement metrics for a campaign
 */
router.route("/update").post(async (req, res) => {
  try {
    const { campaign_id, metricsA, metricsB, simulate = false } = req.body;

    if (!campaign_id) {
      return res.status(400).json({
        success: false,
        error: "campaign_id is required",
      });
    }

    // Find the campaign
    const campaign = await Campaign.findOne({ campaign_id });
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: "Campaign not found",
      });
    }

    if (campaign.status !== "active") {
      return res.status(400).json({
        success: false,
        error: "Campaign is not active",
      });
    }

    let updatedMetricsA = metricsA;
    let updatedMetricsB = metricsB;

    // Simulate metrics if requested or if no metrics provided
    if (simulate || (!metricsA && !metricsB)) {
      console.log(`Simulating metrics for campaign: ${campaign_id}`);
      updatedMetricsA = simulateEngagementMetrics(
        campaign.contentA,
        campaign.platform
      );
      updatedMetricsB = simulateEngagementMetrics(
        campaign.contentB,
        campaign.platform
      );
    }

    // Update metrics
    if (updatedMetricsA) {
      campaign.metrics.A = {
        ...campaign.metrics.A,
        ...updatedMetricsA,
      };
    }

    if (updatedMetricsB) {
      campaign.metrics.B = {
        ...campaign.metrics.B,
        ...updatedMetricsB,
      };
    }

    await campaign.save();

    console.log(`Metrics updated for campaign: ${campaign_id}`);
    console.log(`Metrics A:`, campaign.metrics.A);
    console.log(`Metrics B:`, campaign.metrics.B);

    res.json({
      success: true,
      message: "Metrics updated successfully",
      data: {
        campaign_id: campaign.campaign_id,
        metrics: campaign.metrics,
        total_engagement_a: campaign.totalEngagementA,
        total_engagement_b: campaign.totalEngagementB,
      },
    });
  } catch (error) {
    console.error("Error updating metrics:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to update metrics",
    });
  }
});

/**
 * GET /api/abtest/result/:campaign_id
 * Get A/B test results and determine winner
 */
router.route("/result/:campaign_id").get(async (req, res) => {
  try {
    const { campaign_id } = req.params;

    // Find the campaign
    const campaign = await Campaign.findOne({ campaign_id });
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: "Campaign not found",
      });
    }

    // Calculate winner if not already done
    if (!campaign.winner && campaign.status === "active") {
      campaign.calculateWinner();
      await campaign.save();
    }

    // Generate AI feedback if winner is determined
    if (campaign.winner && !campaign.feedback_prompt) {
      try {
        campaign.feedback_prompt = await generateAIFeedback(campaign);
        campaign.performance_insights = campaign.getPerformanceSummary();
        await campaign.save();
      } catch (error) {
        console.error("Error generating AI feedback:", error);
      }
    }

    // Get performance summary
    const performanceSummary = campaign.getPerformanceSummary();

    // Prepare response
    const response = {
      success: true,
      data: {
        campaign_id: campaign.campaign_id,
        status: campaign.status,
        winner: campaign.winner,
        performance_summary: performanceSummary,
        content: {
          A: campaign.contentA,
          B: campaign.contentB,
        },
        metrics: campaign.metrics,
        platform: campaign.platform,
        target_audience: campaign.target_audience,
        tone: campaign.tone,
        created_at: campaign.created_at,
        completed_at: campaign.completed_at,
        feedback_prompt: campaign.feedback_prompt,
        performance_insights: campaign.performance_insights,
      },
    };

    // Log results
    console.log(`A/B Test Results for ${campaign_id}:`);
    console.log(`Winner: ${campaign.winner}`);
    console.log(`Engagement A: ${performanceSummary.engagement_a.total}`);
    console.log(`Engagement B: ${performanceSummary.engagement_b.total}`);
    console.log(`Improvement: ${performanceSummary.improvement_percentage}%`);

    res.json(response);
  } catch (error) {
    console.error("Error getting A/B test results:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get A/B test results",
    });
  }
});

/**
 * POST /api/abtest/complete
 * Manually complete an A/B test and determine winner
 */
router.route("/complete").post(async (req, res) => {
  try {
    const { campaign_id } = req.body;

    if (!campaign_id) {
      return res.status(400).json({
        success: false,
        error: "campaign_id is required",
      });
    }

    // Find the campaign
    const campaign = await Campaign.findOne({ campaign_id });
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: "Campaign not found",
      });
    }

    if (campaign.status !== "active") {
      return res.status(400).json({
        success: false,
        error: "Campaign is not active",
      });
    }

    // Calculate winner
    const winner = campaign.calculateWinner();
    await campaign.save();

    // Generate AI feedback
    try {
      campaign.feedback_prompt = await generateAIFeedback(campaign);
      campaign.performance_insights = campaign.getPerformanceSummary();
      await campaign.save();
    } catch (error) {
      console.error("Error generating AI feedback:", error);
    }

    // Save to Google Sheets if configured
    try {
      const performanceSummary = campaign.getPerformanceSummary();
      await appendToSheet(
        `A/B Test Results - Winner: ${winner}`,
        performanceSummary.improvement_percentage,
        `Campaign ${campaign_id}`
      );
    } catch (error) {
      console.error("Error saving to Google Sheets:", error);
    }

    const performanceSummary = campaign.getPerformanceSummary();

    res.json({
      success: true,
      message: "A/B test completed successfully",
      data: {
        campaign_id: campaign.campaign_id,
        winner: campaign.winner,
        performance_summary: performanceSummary,
        feedback_prompt: campaign.feedback_prompt,
        completed_at: campaign.completed_at,
      },
    });
  } catch (error) {
    console.error("Error completing A/B test:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to complete A/B test",
    });
  }
});

/**
 * GET /api/abtest/campaigns
 * Get all campaigns with optional filtering
 */
router.route("/campaigns").get(async (req, res) => {
  try {
    const { status, platform, limit = 10, page = 1 } = req.query;

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (platform) filter.platform = platform;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get campaigns
    const campaigns = await Campaign.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select("-__v");

    // Get total count
    const total = await Campaign.countDocuments(filter);

    res.json({
      success: true,
      data: {
        campaigns,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Error getting campaigns:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get campaigns",
    });
  }
});

/**
 * GET /api/abtest/statistics
 * Get A/B testing statistics
 */
router.route("/statistics").get(async (req, res) => {
  try {
    const stats = await Campaign.getStatistics();

    // Get recent campaigns for additional insights
    const recentCampaigns = await Campaign.find({ status: "completed" })
      .sort({ completed_at: -1 })
      .limit(10)
      .select("campaign_id winner metrics platform created_at completed_at");

    res.json({
      success: true,
      data: {
        statistics: stats,
        recent_campaigns: recentCampaigns,
      },
    });
  } catch (error) {
    console.error("Error getting statistics:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get statistics",
    });
  }
});

/**
 * DELETE /api/abtest/:campaign_id
 * Delete a campaign
 */
router.route("/:campaign_id").delete(async (req, res) => {
  try {
    const { campaign_id } = req.params;

    const campaign = await Campaign.findOneAndDelete({ campaign_id });
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: "Campaign not found",
      });
    }

    res.json({
      success: true,
      message: "Campaign deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting campaign:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to delete campaign",
    });
  }
});

export default router;
