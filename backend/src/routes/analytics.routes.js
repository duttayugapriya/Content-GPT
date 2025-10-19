import { Router } from "express";
import fs from "fs";
import path from "path";

const router = Router();

// Store analytics events in a JSON file (in production, use a proper database)
const analyticsFile = path.join(process.cwd(), "analytics.json");

// Ensure analytics file exists
if (!fs.existsSync(analyticsFile)) {
  fs.writeFileSync(analyticsFile, JSON.stringify([]));
}

// Track analytics event
router.route("/track").post(async (req, res) => {
  try {
    const event = req.body;

    // Add timestamp if not provided
    if (!event.timestamp) {
      event.timestamp = new Date().toISOString();
    }

    // Read existing events
    let events = [];
    try {
      const data = fs.readFileSync(analyticsFile, "utf8");
      events = JSON.parse(data);
    } catch (error) {
      console.error("Error reading analytics file:", error);
      events = [];
    }

    // Add new event
    events.push(event);

    // Keep only last 10000 events to prevent file from growing too large
    if (events.length > 10000) {
      events = events.slice(-10000);
    }

    // Write back to file
    fs.writeFileSync(analyticsFile, JSON.stringify(events, null, 2));

    res.json({ success: true, message: "Event tracked successfully" });
  } catch (error) {
    console.error("Error tracking event:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get analytics data
router.route("/data").get(async (req, res) => {
  try {
    const { experiment_id, event_type, start_date, end_date } = req.query;

    let events = [];
    try {
      const data = fs.readFileSync(analyticsFile, "utf8");
      events = JSON.parse(data);
    } catch (error) {
      console.error("Error reading analytics file:", error);
      return res
        .status(500)
        .json({ success: false, error: "Failed to read analytics data" });
    }

    // Filter events based on query parameters
    let filteredEvents = events;

    if (experiment_id) {
      filteredEvents = filteredEvents.filter(
        (event) => event.properties?.experiment_id === experiment_id
      );
    }

    if (event_type) {
      filteredEvents = filteredEvents.filter(
        (event) => event.event === event_type
      );
    }

    if (start_date) {
      const start = new Date(start_date);
      filteredEvents = filteredEvents.filter(
        (event) => new Date(event.timestamp) >= start
      );
    }

    if (end_date) {
      const end = new Date(end_date);
      filteredEvents = filteredEvents.filter(
        (event) => new Date(event.timestamp) <= end
      );
    }

    res.json({
      success: true,
      data: filteredEvents,
      total: filteredEvents.length,
    });
  } catch (error) {
    console.error("Error getting analytics data:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get experiment results
router.route("/experiment/:experimentId").get(async (req, res) => {
  try {
    const { experimentId } = req.params;
    const { start_date, end_date } = req.query;

    let events = [];
    try {
      const data = fs.readFileSync(analyticsFile, "utf8");
      events = JSON.parse(data);
    } catch (error) {
      console.error("Error reading analytics file:", error);
      return res
        .status(500)
        .json({ success: false, error: "Failed to read analytics data" });
    }

    // Filter events for this experiment
    let experimentEvents = events.filter(
      (event) => event.properties?.experiment_id === experimentId
    );

    // Apply date filters if provided
    if (start_date) {
      const start = new Date(start_date);
      experimentEvents = experimentEvents.filter(
        (event) => new Date(event.timestamp) >= start
      );
    }

    if (end_date) {
      const end = new Date(end_date);
      experimentEvents = experimentEvents.filter(
        (event) => new Date(event.timestamp) <= end
      );
    }

    // Calculate conversion rates by variant
    const variantStats = {};

    experimentEvents.forEach((event) => {
      const variant = event.properties?.variant || "unknown";
      const eventType = event.event;

      if (!variantStats[variant]) {
        variantStats[variant] = {
          views: 0,
          conversions: 0,
          form_submissions: 0,
          content_generated: 0,
          button_clicks: 0,
        };
      }

      if (eventType === "experiment_view") {
        variantStats[variant].views++;
      } else if (eventType === "conversion") {
        variantStats[variant].conversions++;

        // Track specific conversion types
        const conversionType = event.properties?.event_name;
        if (conversionType === "form_submission") {
          variantStats[variant].form_submissions++;
        } else if (conversionType === "content_generated") {
          variantStats[variant].content_generated++;
        } else if (conversionType === "button_click") {
          variantStats[variant].button_clicks++;
        }
      }
    });

    // Calculate conversion rates
    Object.keys(variantStats).forEach((variant) => {
      const stats = variantStats[variant];
      stats.conversion_rate =
        stats.views > 0 ? (stats.conversions / stats.views) * 100 : 0;
      stats.form_submission_rate =
        stats.views > 0 ? (stats.form_submissions / stats.views) * 100 : 0;
      stats.content_generation_rate =
        stats.views > 0 ? (stats.content_generated / stats.views) * 100 : 0;
    });

    res.json({
      success: true,
      experiment_id: experimentId,
      stats: variantStats,
      total_events: experimentEvents.length,
    });
  } catch (error) {
    console.error("Error getting experiment results:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all experiments summary
router.route("/experiments").get(async (req, res) => {
  try {
    let events = [];
    try {
      const data = fs.readFileSync(analyticsFile, "utf8");
      events = JSON.parse(data);
    } catch (error) {
      console.error("Error reading analytics file:", error);
      return res
        .status(500)
        .json({ success: false, error: "Failed to read analytics data" });
    }

    // Get unique experiment IDs
    const experimentIds = [
      ...new Set(
        events
          .filter((event) => event.properties?.experiment_id)
          .map((event) => event.properties.experiment_id)
      ),
    ];

    const experiments = experimentIds.map((experimentId) => {
      const experimentEvents = events.filter(
        (event) => event.properties?.experiment_id === experimentId
      );

      const variantStats = {};
      experimentEvents.forEach((event) => {
        const variant = event.properties?.variant || "unknown";
        const eventType = event.event;

        if (!variantStats[variant]) {
          variantStats[variant] = { views: 0, conversions: 0 };
        }

        if (eventType === "experiment_view") {
          variantStats[variant].views++;
        } else if (eventType === "conversion") {
          variantStats[variant].conversions++;
        }
      });

      // Calculate overall conversion rate
      const totalViews = Object.values(variantStats).reduce(
        (sum, stats) => sum + stats.views,
        0
      );
      const totalConversions = Object.values(variantStats).reduce(
        (sum, stats) => sum + stats.conversions,
        0
      );
      const overallConversionRate =
        totalViews > 0 ? (totalConversions / totalViews) * 100 : 0;

      return {
        experiment_id: experimentId,
        total_events: experimentEvents.length,
        total_views: totalViews,
        total_conversions: totalConversions,
        overall_conversion_rate: overallConversionRate,
        variants: variantStats,
      };
    });

    res.json({
      success: true,
      experiments: experiments,
      total_experiments: experiments.length,
    });
  } catch (error) {
    console.error("Error getting experiments summary:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
