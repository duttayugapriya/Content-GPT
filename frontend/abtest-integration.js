// A/B Testing Frontend Integration for Marketing GPT
class ABTestIntegration {
  constructor() {
    this.apiBaseUrl = "http://localhost:5000/api/abtest";
    this.currentCampaignId = null;
  }

  /**
   * Start a new A/B test campaign
   * @param {string} contentA - First content version
   * @param {string} contentB - Second content version
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Campaign data
   */
  async startCampaign(contentA, contentB, options = {}) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contentA,
          contentB,
          platform: options.platform || "General",
          target_audience: options.target_audience || null,
          tone: options.tone || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        this.currentCampaignId = result.data.campaign_id;
        console.log("A/B Test started:", this.currentCampaignId);
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error starting A/B test:", error);
      throw error;
    }
  }

  /**
   * Update engagement metrics for the current campaign
   * @param {Object} metricsA - Metrics for content A
   * @param {Object} metricsB - Metrics for content B
   * @param {boolean} simulate - Whether to simulate metrics
   * @returns {Promise<Object>} Updated metrics
   */
  async updateMetrics(metricsA = null, metricsB = null, simulate = false) {
    if (!this.currentCampaignId) {
      throw new Error("No active campaign. Start a campaign first.");
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          campaign_id: this.currentCampaignId,
          metricsA,
          metricsB,
          simulate,
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log("Metrics updated:", result.data);
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error updating metrics:", error);
      throw error;
    }
  }

  /**
   * Get A/B test results
   * @param {string} campaignId - Campaign ID (optional, uses current if not provided)
   * @returns {Promise<Object>} Test results
   */
  async getResults(campaignId = null) {
    const id = campaignId || this.currentCampaignId;

    if (!id) {
      throw new Error("No campaign ID provided");
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/result/${id}`);
      const result = await response.json();

      if (result.success) {
        console.log("A/B Test results:", result.data);
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error getting results:", error);
      throw error;
    }
  }

  /**
   * Complete the current A/B test
   * @returns {Promise<Object>} Completion data
   */
  async completeTest() {
    if (!this.currentCampaignId) {
      throw new Error("No active campaign");
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          campaign_id: this.currentCampaignId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log("A/B Test completed:", result.data);
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error completing test:", error);
      throw error;
    }
  }

  /**
   * Get all campaigns
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Campaigns data
   */
  async getCampaigns(filters = {}) {
    try {
      const queryParams = new URLSearchParams(filters);
      const response = await fetch(
        `${this.apiBaseUrl}/campaigns?${queryParams}`
      );
      const result = await response.json();

      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error getting campaigns:", error);
      throw error;
    }
  }

  /**
   * Get A/B testing statistics
   * @returns {Promise<Object>} Statistics data
   */
  async getStatistics() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/statistics`);
      const result = await response.json();

      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error getting statistics:", error);
      throw error;
    }
  }

  /**
   * Simulate a complete A/B test workflow
   * @param {string} contentA - First content version
   * @param {string} contentB - Second content version
   * @param {Object} options - Test options
   * @returns {Promise<Object>} Complete test results
   */
  async simulateTest(contentA, contentB, options = {}) {
    try {
      console.log("Starting A/B test simulation...");

      // Start campaign
      const campaign = await this.startCampaign(contentA, contentB, options);
      console.log("Campaign started:", campaign.campaign_id);

      // Wait a bit (simulate time passing)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update metrics with simulation
      const metrics = await this.updateMetrics(null, null, true);
      console.log("Metrics simulated:", metrics);

      // Wait a bit more
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Complete test
      const results = await this.completeTest();
      console.log("Test completed:", results);

      return results;
    } catch (error) {
      console.error("Error in test simulation:", error);
      throw error;
    }
  }

  /**
   * Display A/B test results in a formatted way
   * @param {Object} results - Test results
   * @param {HTMLElement} container - Container element to display results
   */
  displayResults(results, container) {
    const summary = results.performance_summary;

    const html = `
      <div class="abtest-results">
        <h3>A/B Test Results</h3>
        <div class="campaign-info">
          <p><strong>Campaign ID:</strong> ${results.campaign_id}</p>
          <p><strong>Platform:</strong> ${results.platform}</p>
          <p><strong>Winner:</strong> <span class="winner">${
            results.winner || "Tie"
          }</span></p>
        </div>
        
        <div class="performance-comparison">
          <div class="version-a">
            <h4>Version A</h4>
            <div class="content">${results.content.A}</div>
            <div class="metrics">
              <div class="metric">Likes: ${
                summary.engagement_a.metrics.likes
              }</div>
              <div class="metric">Comments: ${
                summary.engagement_a.metrics.comments
              }</div>
              <div class="metric">Shares: ${
                summary.engagement_a.metrics.shares
              }</div>
              <div class="metric">Total: ${summary.engagement_a.total}</div>
              <div class="metric">Percentage: ${
                summary.engagement_a.percentage
              }%</div>
            </div>
          </div>
          
          <div class="version-b">
            <h4>Version B</h4>
            <div class="content">${results.content.B}</div>
            <div class="metrics">
              <div class="metric">Likes: ${
                summary.engagement_b.metrics.likes
              }</div>
              <div class="metric">Comments: ${
                summary.engagement_b.metrics.comments
              }</div>
              <div class="metric">Shares: ${
                summary.engagement_b.metrics.shares
              }</div>
              <div class="metric">Total: ${summary.engagement_b.total}</div>
              <div class="metric">Percentage: ${
                summary.engagement_b.percentage
              }%</div>
            </div>
          </div>
        </div>
        
        <div class="insights">
          <h4>AI Feedback</h4>
          <div class="feedback">${
            results.feedback_prompt || "No feedback available"
          }</div>
        </div>
        
        <div class="improvement">
          <p><strong>Improvement:</strong> ${
            summary.improvement_percentage
          }%</p>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }
}

// Example usage and integration with existing MarketingGPT class
class MarketingGPTWithABTest extends MarketingGPT {
  constructor() {
    super();
    this.abTest = new ABTestIntegration();
    this.setupABTestIntegration();
  }

  setupABTestIntegration() {
    // Override the displayResults method to include A/B testing
    const originalDisplayResults = this.displayResults.bind(this);

    this.displayResults = (posts) => {
      // Call original display method
      originalDisplayResults(posts);

      // Add A/B testing option
      this.addABTestOption(posts);
    };
  }

  addABTestOption(posts) {
    const resultsSection = document.getElementById("resultsSection");
    if (!resultsSection) return;

    // Create A/B test button
    const abTestButton = document.createElement("button");
    abTestButton.className = "abtest-btn";
    abTestButton.innerHTML =
      '<i class="fas fa-flask"></i> A/B Test These Posts';
    abTestButton.onclick = async () => {
  const results = await this.abTest.simulateTest(
    posts[0].post,
    posts[1].post,
    {}
  );

  // Log to console (keeps current behavior)
  console.log("A/B Test results:", results);

  // Show on page below posts
  const resultsDiv = document.createElement("div");
  resultsDiv.className = "ab-results-ui";
  resultsDiv.innerHTML = `<pre>${JSON.stringify(results, null, 2)}</pre>`;
  document.querySelector(".results-container").appendChild(resultsDiv);
};


    // Add button to results section
    const resultsContainer = document.querySelector(".results-container");
    if (resultsContainer) {
      resultsContainer.appendChild(abTestButton);
    }
  }

  async startABTest(posts) {
    if (posts.length < 2) {
      this.showToast("Need at least 2 posts to run A/B test", "error");
      return;
    }

    try {
      this.showToast("Starting A/B test...", "success");

      // Use first two posts for A/B test
      const contentA = posts[0].post;
      const contentB = posts[1].post;

      // Get form data for context
      const formData = new FormData(document.getElementById("contentForm"));
      const platform = formData.get("platform") || "General";
      const targetAudience = formData.get("target_audience") || null;
      const tone = formData.get("tone") || null;

      // Start A/B test
      const results = await this.abTest.simulateTest(contentA, contentB, {
        platform,
        target_audience,
        tone,
      });

      // Display results
      this.displayABTestResults(results);
    } catch (error) {
      console.error("A/B test error:", error);
      this.showToast("A/B test failed: " + error.message, "error");
    }
  }

  displayABTestResults(results) {
    // Create results modal or section
    const modal = document.createElement("div");
    modal.className = "abtest-modal";
    modal.innerHTML = `
      <div class="abtest-modal-content">
        <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
        <div id="abtest-results-container"></div>
      </div>
    `;

    document.body.appendChild(modal);

    // Display results
    const container = document.getElementById("abtest-results-container");
    this.abTest.displayResults(results, container);

    this.showToast("A/B test completed!", "success");
  }
}

// Export for use
window.ABTestIntegration = ABTestIntegration;
window.MarketingGPTWithABTest = MarketingGPTWithABTest;
