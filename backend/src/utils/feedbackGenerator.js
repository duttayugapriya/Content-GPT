import { CohereClient } from "cohere-ai";
import dotenv from "dotenv";

dotenv.config();

const cohere = new CohereClient({ token: process.env.COHERE_API_KEY });

/**
 * Generates feedback prompt for AI model improvement based on A/B test results
 * @param {Object} winnerContent - The winning content version
 * @param {Object} loserContent - The losing content version
 * @param {Object} metrics - Performance metrics
 * @param {string} platform - Social media platform
 * @returns {string} Generated feedback prompt
 */
export function generateFeedbackPrompt(
  winnerContent,
  loserContent,
  metrics,
  platform = "General"
) {
  const engagementDiff = metrics.engagement_winner - metrics.engagement_loser;
  const improvementPercentage = metrics.improvement_percentage;

  // Analyze what made the winner better
  const analysis = analyzeContentDifferences(winnerContent, loserContent);

  const feedbackPrompt = `
Based on A/B testing results, the following content performed better:

WINNING CONTENT (${metrics.winner}):
"${winnerContent}"

LOSING CONTENT:
"${loserContent}"

PERFORMANCE METRICS:
- Winner engagement: ${metrics.engagement_winner}
- Loser engagement: ${metrics.engagement_loser}
- Improvement: ${improvementPercentage}%
- Platform: ${platform}

KEY INSIGHTS:
${analysis}

FEEDBACK FOR FUTURE CONTENT GENERATION:
1. Focus on ${analysis.tone_insight}
2. Use ${analysis.structure_insight}
3. Emphasize ${analysis.content_insight}
4. Consider ${analysis.engagement_insight}

Generate future content that incorporates these successful elements while maintaining creativity and relevance to the target audience.
`;

  return feedbackPrompt.trim();
}

/**
 * Analyzes differences between winning and losing content
 * @param {string} winner - Winning content
 * @param {string} loser - Losing content
 * @returns {Object} Analysis insights
 */
function analyzeContentDifferences(winner, loser) {
  const winnerWords = winner.split(" ").length;
  const loserWords = loser.split(" ").length;

  const winnerHasEmojis =
    /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(
      winner
    );
  const loserHasEmojis =
    /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(
      loser
    );

  const winnerHasQuestions = winner.includes("?");
  const loserHasQuestions = loser.includes("?");

  const winnerHasCallToAction =
    /(click|visit|buy|shop|learn|discover|try|get|download|sign up|subscribe|follow|share)/i.test(
      winner
    );
  const loserHasCallToAction =
    /(click|visit|buy|shop|learn|discover|try|get|download|sign up|subscribe|follow|share)/i.test(
      loser
    );

  const winnerHasNumbers = /\d+/.test(winner);
  const loserHasNumbers = /\d+/.test(loser);

  return {
    tone_insight:
      winnerHasEmojis && !loserHasEmojis
        ? "more engaging and friendly tone with emojis"
        : winnerHasQuestions && !loserHasQuestions
        ? "conversational tone with questions"
        : "professional yet engaging tone",

    structure_insight:
      winnerWords > loserWords
        ? "more detailed and comprehensive content"
        : winnerWords < loserWords
        ? "concise and punchy content"
        : "balanced content length",

    content_insight:
      winnerHasCallToAction && !loserHasCallToAction
        ? "clear call-to-action elements"
        : winnerHasNumbers && !loserHasNumbers
        ? "specific data and numbers"
        : "compelling value propositions",

    engagement_insight: winnerHasEmojis
      ? "visual elements and emojis increase engagement"
      : winnerHasQuestions
      ? "interactive questions drive engagement"
      : "clear value proposition drives engagement",
  };
}

/**
 * Generates AI-powered feedback using Cohere
 * @param {Object} campaign - Campaign data
 * @returns {Promise<string>} AI-generated feedback
 */
export async function generateAIFeedback(campaign) {
  try {
    const prompt = `
Analyze this A/B test result and provide insights for improving future content generation:

WINNER: ${campaign.winner}
CONTENT A: "${campaign.contentA}"
CONTENT B: "${campaign.contentB}"

METRICS A: ${JSON.stringify(campaign.metrics.A)}
METRICS B: ${JSON.stringify(campaign.metrics.B)}

PLATFORM: ${campaign.platform}
TARGET AUDIENCE: ${campaign.target_audience}
TONE: ${campaign.tone}

Provide specific, actionable insights about:
1. What made the winner perform better
2. Key elements to incorporate in future content
3. Areas for improvement
4. Platform-specific recommendations

Keep the response concise but comprehensive, focusing on actionable insights for content creators.
`;

    const response = await cohere.chat({
      model: "command-r-08-2024",
      message: prompt,
      temperature: 0.7,
    });

    return (
      response.text?.trim() ||
      response.output_text?.trim() ||
      response.message?.content?.[0]?.text?.trim() ||
      "Unable to generate AI feedback."
    );
  } catch (error) {
    console.error("Error generating AI feedback:", error);
    return generateFeedbackPrompt(
      campaign.winner === "A" ? campaign.contentA : campaign.contentB,
      campaign.winner === "A" ? campaign.contentB : campaign.contentA,
      {
        engagement_winner:
          campaign.winner === "A"
            ? campaign.metrics.A.likes +
              campaign.metrics.A.comments +
              campaign.metrics.A.shares
            : campaign.metrics.B.likes +
              campaign.metrics.B.comments +
              campaign.metrics.B.shares,
        engagement_loser:
          campaign.winner === "A"
            ? campaign.metrics.B.likes +
              campaign.metrics.B.comments +
              campaign.metrics.B.shares
            : campaign.metrics.A.likes +
              campaign.metrics.A.comments +
              campaign.metrics.A.shares,
        improvement_percentage:
          campaign.getPerformanceSummary().improvement_percentage,
      },
      campaign.platform
    );
  }
}

/**
 * Simulates engagement metrics for testing purposes
 * @param {string} content - Content to simulate metrics for
 * @param {string} platform - Social media platform
 * @returns {Object} Simulated metrics
 */
export function simulateEngagementMetrics(content, platform = "General") {
  const baseEngagement = Math.floor(Math.random() * 100) + 10;
  const contentLength = content.length;
  const hasEmojis =
    /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(
      content
    );
  const hasQuestions = content.includes("?");
  const hasCallToAction =
    /(click|visit|buy|shop|learn|discover|try|get|download|sign up|subscribe|follow|share)/i.test(
      content
    );

  // Platform-specific multipliers
  const platformMultipliers = {
    Instagram: { likes: 1.5, comments: 1.2, shares: 1.3 },
    Facebook: { likes: 1.3, comments: 1.5, shares: 1.4 },
    Twitter: { likes: 1.1, comments: 1.8, shares: 1.6 },
    LinkedIn: { likes: 1.2, comments: 1.3, shares: 1.1 },
    TikTok: { likes: 2.0, comments: 1.4, shares: 1.8 },
    YouTube: { likes: 1.4, comments: 1.6, shares: 1.2 },
    General: { likes: 1.0, comments: 1.0, shares: 1.0 },
  };

  const multiplier =
    platformMultipliers[platform] || platformMultipliers["General"];

  // Content quality factors
  let qualityMultiplier = 1.0;
  if (hasEmojis) qualityMultiplier += 0.2;
  if (hasQuestions) qualityMultiplier += 0.15;
  if (hasCallToAction) qualityMultiplier += 0.1;
  if (contentLength > 100 && contentLength < 500) qualityMultiplier += 0.1;

  const finalEngagement = Math.floor(baseEngagement * qualityMultiplier);

  return {
    likes: Math.floor(
      finalEngagement * multiplier.likes * (0.7 + Math.random() * 0.6)
    ),
    comments: Math.floor(
      finalEngagement * multiplier.comments * (0.1 + Math.random() * 0.3)
    ),
    shares: Math.floor(
      finalEngagement * multiplier.shares * (0.05 + Math.random() * 0.2)
    ),
    views: Math.floor(finalEngagement * 10 * (0.8 + Math.random() * 0.4)),
    clicks: Math.floor(finalEngagement * 0.1 * (0.5 + Math.random() * 1.0)),
  };
}
