import mongoose from "mongoose";
const {Schema} = mongoose;

// Engagement metrics schema
const metricsSchema = new mongoose.Schema(
  {
    likes: {
      type: Number,
      default: 0,
      min: 0,
    },
    comments: {
      type: Number,
      default: 0,
      min: 0,
    },
    shares: {
      type: Number,
      default: 0,
      min: 0,
    },
    views: {
      type: Number,
      default: 0,
      min: 0,
    },
    clicks: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

// Campaign schema
const campaignSchema = new mongoose.Schema(
  {
    campaign_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    contentA: {
      type: String,
      required: true,
      trim: true,
    },
    contentB: {
      type: String,
      required: true,
      trim: true,
    },
    metrics: {
      A: {
        type: metricsSchema,
        default: () => ({}),
      },
      B: {
        type: metricsSchema,
        default: () => ({}),
      },
    },
    winner: {
      type: String,
      enum: ["A", "B", null],
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
    completed_at: {
      type: Date,
      default: null,
    },
    // Additional metadata
    platform: {
      type: String,
      enum: [
        "Instagram",
        "Facebook",
        "Twitter",
        "LinkedIn",
        "TikTok",
        "YouTube",
        "General",
      ],
      default: "General",
    },
    target_audience: {
      type: String,
      trim: true,
    },
    tone: {
      type: String,
      trim: true,
    },
    // AI feedback and learning
    feedback_prompt: {
      type: String,
      default: null,
    },
    performance_insights: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
campaignSchema.index({ campaign_id: 1 });
campaignSchema.index({ status: 1 });
campaignSchema.index({ created_at: -1 });
campaignSchema.index({ winner: 1 });

// Virtual for total engagement score
campaignSchema.virtual("totalEngagementA").get(function () {
  const metrics = this.metrics.A;
  return (
    (metrics.likes || 0) +
    (metrics.comments || 0) +
    (metrics.shares || 0) +
    (metrics.clicks || 0)
  );
});

campaignSchema.virtual("totalEngagementB").get(function () {
  const metrics = this.metrics.B;
  return (
    (metrics.likes || 0) +
    (metrics.comments || 0) +
    (metrics.shares || 0) +
    (metrics.clicks || 0)
  );
});

// Method to calculate winner
campaignSchema.methods.calculateWinner = function () {
  const engagementA = this.totalEngagementA;
  const engagementB = this.totalEngagementB;

  if (engagementA > engagementB) {
    this.winner = "A";
  } else if (engagementB > engagementA) {
    this.winner = "B";
  } else {
    this.winner = null; // Tie
  }

  this.status = "completed";
  this.completed_at = new Date();
  return this.winner;
};

// Method to get performance summary
campaignSchema.methods.getPerformanceSummary = function () {
  const engagementA = this.totalEngagementA;
  const engagementB = this.totalEngagementB;
  const totalEngagement = engagementA + engagementB;

  return {
    winner: this.winner,
    total_engagement: totalEngagement,
    engagement_a: {
      total: engagementA,
      percentage:
        totalEngagement > 0
          ? ((engagementA / totalEngagement) * 100).toFixed(2)
          : 0,
      metrics: this.metrics.A,
    },
    engagement_b: {
      total: engagementB,
      percentage:
        totalEngagement > 0
          ? ((engagementB / totalEngagement) * 100).toFixed(2)
          : 0,
      metrics: this.metrics.B,
    },
    improvement_percentage: this.winner
      ? (
          (Math.abs(engagementA - engagementB) /
            Math.max(engagementA, engagementB)) *
          100
        ).toFixed(2)
      : 0,
  };
};

// Pre-save middleware to update updated_at
campaignSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

// Static method to generate unique campaign ID
campaignSchema.statics.generateCampaignId = function () {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `campaign_${timestamp}_${random}`;
};

// Static method to get campaign statistics
campaignSchema.statics.getStatistics = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        total_campaigns: { $sum: 1 },
        active_campaigns: {
          $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
        },
        completed_campaigns: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
        },
        a_wins: {
          $sum: { $cond: [{ $eq: ["$winner", "A"] }, 1, 0] },
        },
        b_wins: {
          $sum: { $cond: [{ $eq: ["$winner", "B"] }, 1, 0] },
        },
        ties: {
          $sum: { $cond: [{ $eq: ["$winner", null] }, 1, 0] },
        },
      },
    },
  ]);

  return (
    stats[0] || {
      total_campaigns: 0,
      active_campaigns: 0,
      completed_campaigns: 0,
      a_wins: 0,
      b_wins: 0,
      ties: 0,
    }
  );
};

const Campaign = mongoose.model("Campaign", campaignSchema);

export default Campaign;
