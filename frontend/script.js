// Marketing GPT Frontend JavaScript
class MarketingGPT {
  constructor() {
    this.apiBaseUrl = "http://localhost:5000/api";
    this.abTesting = null;
    this.abTestIntegration = null;
    this.currentPosts = [];
    this.init();
    this.postContainer = document.getElementById("abtestResults");

  }

  init() {
    this.bindEvents();
    this.setupFormValidation();
    this.initializeABTesting();
  }

  initializeABTesting() {
    // Initialize A/B testing after DOM is fully loaded
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        this.abTesting = new ABTesting();
        this.abTestIntegration = new ABTestIntegration();
        this.setupABTestIntegration();
      });
    } else {
      // DOM is already loaded
      this.abTesting = new ABTesting();
      this.abTestIntegration = new ABTestIntegration();
      this.setupABTestIntegration();
    }
  }

  setupABTestIntegration() {
    if (!this.abTesting) return;

    // Track form submissions for A/B testing
    const form = document.getElementById("contentForm");
    if (form) {
      form.addEventListener("submit", (e) => {
        const activeExperiments = this.abTesting.getActiveExperiments();
        Object.keys(activeExperiments).forEach((experimentId) => {
          const variant = activeExperiments[experimentId].variant;
          const formData = new FormData(e.target);
          const data = Object.fromEntries(formData.entries());
          this.abTesting.trackFormSubmission(experimentId, variant, data);
        });
      });
    }

    // Track button clicks
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("action-btn")) {
        const activeExperiments = this.abTesting.getActiveExperiments();
        Object.keys(activeExperiments).forEach((experimentId) => {
          const variant = activeExperiments[experimentId].variant;
          const buttonType = e.target.classList.contains("copy-btn")
            ? "copy"
            : "slack";
          this.abTesting.trackButtonClick(buttonType, experimentId, variant);
        });
      }
    });
  }

  bindEvents() {
    const form = document.getElementById("contentForm");
    form.addEventListener("submit", (e) => this.handleFormSubmit(e));
  }

  setupFormValidation() {
    const inputs = document.querySelectorAll(
      "input[required], select[required]"
    );
    inputs.forEach((input) => {
      input.addEventListener("blur", () => this.validateField(input));
      input.addEventListener("input", () => this.clearFieldError(input));
    });
  }

  validateField(field) {
    const value = field.value.trim();
    const isValid = value !== "";

    if (!isValid) {
      this.showFieldError(field, "This field is required");
    } else {
      this.clearFieldError(field);
    }

    return isValid;
  }

  showFieldError(field, message) {
    this.clearFieldError(field);

    const errorDiv = document.createElement("div");
    errorDiv.className = "field-error";
    errorDiv.textContent = message;
    errorDiv.style.color = "#e53e3e";
    errorDiv.style.fontSize = "0.875rem";
    errorDiv.style.marginTop = "0.25rem";

    field.parentNode.appendChild(errorDiv);
    field.style.borderColor = "#e53e3e";
  }

  clearFieldError(field) {
    const existingError = field.parentNode.querySelector(".field-error");
    if (existingError) {
      existingError.remove();
    }
    field.style.borderColor = "#e2e8f0";
  }

  async handleFormSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    // Validate all fields
    const isValid = this.validateAllFields();
    if (!isValid) {
      this.showToast("Please fill in all required fields", "error");
      return;
    }

    this.showLoading(true);
    this.hideResults();

    try {
      const response = await this.generateContent(data);
      this.displayResults(response.data);
      this.showToast("Content generated successfully!", "success");

      // Track content generation for A/B testing
      if (this.abTesting) {
        const activeExperiments = this.abTesting.getActiveExperiments();
        Object.keys(activeExperiments).forEach((experimentId) => {
          const variant = activeExperiments[experimentId].variant;
          this.abTesting.trackContentGeneration(
            experimentId,
            variant,
            response.data
          );
        });
      }
    } catch (error) {
      console.error("Error generating content:", error);
      this.showToast(
        error.message || "Failed to generate content. Please try again.",
        "error"
      );
    } finally {
      this.showLoading(false);
    }
  }

  validateAllFields() {
    const requiredFields = document.querySelectorAll(
      "input[required], select[required]"
    );
    let allValid = true;

    requiredFields.forEach((field) => {
      if (!this.validateField(field)) {
        allValid = false;
      }
    });

    return allValid;
  }

  async generateContent(data) {
    const response = await fetch(`${this.apiBaseUrl}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Failed to generate content");
    }

    return result;
  }

  displayResults(posts) {
    const resultsSection = document.getElementById("resultsSection");
    const resultsGrid = document.getElementById("resultsGrid");

    // Store current posts for A/B testing
    this.currentPosts = posts;

    // Clear previous results
    resultsGrid.innerHTML = "";

    // Create post cards
    posts.forEach((post, index) => {
      const postCard = this.createPostCard(post, index);
      resultsGrid.appendChild(postCard);
    });

    // Show results section with animation
    resultsSection.style.display = "block";
    resultsSection.scrollIntoView({ behavior: "smooth" });
  }

  createPostCard(post, index) {
  const card = document.createElement("div");
  card.className = "post-card";
  card.style.animationDelay = `${index * 0.1}s`;

  // Format score display (one decimal if needed)
  const scoreNum = Number(post.score || 0);
  const scoreDisplay = Number.isInteger(scoreNum)
    ? `${scoreNum}/10`
    : `${scoreNum.toFixed(1)}/10`;

  const stars = this.generateStars(scoreNum);

  // Use data attributes instead of inline onclick
  const safePost = this.escapeHtml(post.post);

  card.innerHTML = `
    <div class="post-content">${safePost}</div>
    <div class="post-score">
      <span class="score-label">Engagement Score</span>
      <span class="score-value">
        <span class="score-stars">${stars}</span>
        ${scoreDisplay}
      </span>
    </div>
    <div class="post-actions">
      <button class="action-btn copy-btn" data-post="${safePost}">
        <i class="fas fa-copy"></i> Copy
      </button>
      <button class="action-btn slack-btn" data-post="${safePost}" data-score="${scoreNum}">
        <i class="fab fa-slack"></i> Send to Slack
      </button>
    </div>
  `;

  return card;
}


  generateStars(score) {
  // Normalize and clamp score to 0-10
  const s = Math.max(0, Math.min(10, Number(score) || 0));
  // Convert to 5-star scale (0-5)
  const starValue = (s / 10) * 5;
  const fullStars = Math.floor(starValue);
  const halfStar = (starValue - fullStars) >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

  let stars = "";
  for (let i = 0; i < fullStars; i++) stars += '<i class="fas fa-star"></i>';
  if (halfStar) stars += '<i class="fas fa-star-half-alt"></i>';
  for (let i = 0; i < emptyStars; i++) stars += '<i class="far fa-star"></i>';

  return stars;
}


  escapeHtml(text) {
  if (text == null) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/`/g, "&#96;");
}


  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showToast("Copied to clipboard!", "success");
    } catch (error) {
      console.error("Failed to copy:", error);
      this.showToast("Failed to copy to clipboard", "error");
    }
  }

  async sendToSlack(post, score) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/slack`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ post, score }),
      });

      const result = await response.json();

      if (response.ok) {
        this.showToast("Sent to Slack successfully!", "success");
      } else {
        throw new Error(result.error || "Failed to send to Slack");
      }
    } catch (error) {
      console.error("Failed to send to Slack:", error);
      this.showToast("Failed to send to Slack", "error");
    }
  }

  showLoading(show) {
    const generateBtn = document.getElementById("generateBtn");
    const btnLoading = document.getElementById("btnLoading");

    if (show) {
      generateBtn.classList.add("loading");
      generateBtn.disabled = true;
    } else {
      generateBtn.classList.remove("loading");
      generateBtn.disabled = false;
    }
  }

  hideResults() {
    const resultsSection = document.getElementById("resultsSection");
    resultsSection.style.display = "none";
  }

  showToast(message, type = "success") {
    const toastContainer = document.getElementById("toastContainer");

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;

    toastContainer.appendChild(toast);

    // Auto remove after 4 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 4000);
  }

  // Utility method to handle form reset
  resetForm() {
    document.getElementById("contentForm").reset();
    this.hideResults();
    this.clearAllFieldErrors();
  }

  clearAllFieldErrors() {
    const errorElements = document.querySelectorAll(".field-error");
    errorElements.forEach((error) => error.remove());

    const inputs = document.querySelectorAll("input, select");
    inputs.forEach((input) => {
      input.style.borderColor = "#e2e8f0";
    });
  }

  // A/B Testing Methods
  async startABTest() {
    if (!this.currentPosts || this.currentPosts.length < 2) {
      this.showToast("Need at least 2 posts to run A/B test", "error");
      return;
    }

    try {
      this.showToast("Starting A/B test...", "success");

      // Use first two posts for A/B test
      const contentA = this.currentPosts[0].post;
      const contentB = this.currentPosts[1].post;

      // Get form data for context
      const formData = new FormData(document.getElementById("contentForm"));
      const platform = formData.get("platform") || "General";
      const targetAudience = formData.get("target_audience") || null;
      const tone = formData.get("tone") || null;

      // Start A/B test
      const results = await this.abTestIntegration.simulateTest(
        contentA,
        contentB,
        {
          platform,
          targetAudience,
          tone,
        }
      );

      // Display results
      this.displayABTestResults(results);
    } catch (error) {
      console.error("A/B test error:", error);
      this.showToast("A/B test failed: " + error.message, "error");
    }
  }

  displayABTestResults(results) {
  if (!results.A || !results.B) {
    // fallback for old backend format
    if (results.contentA && results.contentB) {
      results = {
        A: { post: results.contentA, score: results.metricsA?.score || 0, metrics: results.metricsA || {} },
        B: { post: results.contentB, score: results.metricsB?.score || 0, metrics: results.metricsB || {} },
        feedback_prompt: results.feedback_prompt || "",
        performance_summary: results.performance_summary || {},
      };
    } else {
      this.postContainer.innerHTML = "<div class='error-message'>A/B test results incomplete.</div>";
      return;
    }
  }

  this.postContainer.innerHTML = this.createABTestResultHTML(results);
}

createABTestResultHTML(results) {
  const variantA = results.A;
  const variantB = results.B;
  const metricsA = variantA.metrics || {};
  const metricsB = variantB.metrics || {};
  const scoreA = Number(variantA.score || 0);
  const scoreB = Number(variantB.score || 0);

  const winner =
    scoreA > scoreB ? "A" : scoreB > scoreA ? "B" : "Tie";

  const improvement = results.performance_summary?.improvement_percentage || 0;
  const feedback = results.feedback_prompt || "No AI feedback available.";

  return `
    <div class="abtest-result-card">
      <div class="variant variant-A ${winner === "A" ? "winner" : ""}">
        <h3>Variant A ${winner === "A" ? "🏆" : ""}</h3>
        <p>${this.escapeHtml(variantA.post || "")}</p>
        <div class="score">Score: ${scoreA.toFixed(1)}/10</div>
        <div class="metrics">
          <div>Likes: ${metricsA.likes || 0}</div>
          <div>Comments: ${metricsA.comments || 0}</div>
          <div>Shares: ${metricsA.shares || 0}</div>
          <div>Views: ${metricsA.views || 0}</div>
          <div>Clicks: ${metricsA.clicks || 0}</div>
        </div>
      </div>

      <div class="variant variant-B ${winner === "B" ? "winner" : ""}">
        <h3>Variant B ${winner === "B" ? "🏆" : ""}</h3>
        <p>${this.escapeHtml(variantB.post || "")}</p>
        <div class="score">Score: ${scoreB.toFixed(1)}/10</div>
        <div class="metrics">
          <div>Likes: ${metricsB.likes || 0}</div>
          <div>Comments: ${metricsB.comments || 0}</div>
          <div>Shares: ${metricsB.shares || 0}</div>
          <div>Views: ${metricsB.views || 0}</div>
          <div>Clicks: ${metricsB.clicks || 0}</div>
        </div>
      </div>

      <div class="abtest-summary">
        <h4>Winner: ${winner}</h4>
        <p><strong>Total Improvement:</strong> ${improvement}%</p>
        <h4>AI Feedback & Recommendations:</h4>
        <p>${feedback.replace(/\n/g, "<br>")}</p>
      </div>
    </div>
  `;
}





  async showStatistics() {
    try {
      this.showToast("Loading statistics...", "success");

      if (!this.abTestIntegration) {
        this.abTestIntegration = new ABTestIntegration();
      }

      const stats = await this.abTestIntegration.getStatistics();
      this.displayStatistics(stats);
    } catch (error) {
      console.error("Error loading statistics:", error);
      this.showToast("Failed to load statistics: " + error.message, "error");
    }
  }

  displayStatistics(stats) {
    this.showStatsSection();

    const statsGrid = document.getElementById("statsGrid");
    statsGrid.innerHTML = this.createStatisticsHTML(stats);
  }

  createStatisticsHTML(stats) {
    const statistics = stats.statistics;

    return `
      <div class="stat-card">
        <div class="stat-icon"><i class="fas fa-chart-line"></i></div>
        <div class="stat-value">${statistics.total_campaigns}</div>
        <div class="stat-label">Total Campaigns</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon"><i class="fas fa-play-circle"></i></div>
        <div class="stat-value">${statistics.active_campaigns}</div>
        <div class="stat-label">Active Campaigns</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon"><i class="fas fa-check-circle"></i></div>
        <div class="stat-value">${statistics.completed_campaigns}</div>
        <div class="stat-label">Completed Campaigns</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon"><i class="fas fa-trophy"></i></div>
        <div class="stat-value">${statistics.a_wins}</div>
        <div class="stat-label">Version A Wins</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon"><i class="fas fa-medal"></i></div>
        <div class="stat-value">${statistics.b_wins}</div>
        <div class="stat-label">Version B Wins</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon"><i class="fas fa-handshake"></i></div>
        <div class="stat-value">${statistics.ties}</div>
        <div class="stat-label">Ties</div>
      </div>
    `;
  }

  showABTestSection() {
    const abtestSection = document.getElementById("abtestSection");
    abtestSection.style.display = "flex";
  }

  hideABTestSection() {
    const abtestSection = document.getElementById("abtestSection");
    abtestSection.style.display = "none";
  }

  showStatsSection() {
    const statsSection = document.getElementById("statsSection");
    statsSection.style.display = "flex";
  }

  hideStatsSection() {
    const statsSection = document.getElementById("statsSection");
    statsSection.style.display = "none";
  }

  async startNewABTest() {
    if (!this.currentPosts || this.currentPosts.length < 2) {
      this.showToast("Please generate content first", "error");
      return;
    }

    await this.startABTest();
  }

  async simulateABTest() {
    if (!this.currentPosts || this.currentPosts.length < 2) {
      this.showToast("Please generate content first", "error");
      return;
    }

    try {
      this.showToast("Simulating A/B test...", "success");

      const contentA = this.currentPosts[0].post;
      const contentB = this.currentPosts[1].post;

      const formData = new FormData(document.getElementById("contentForm"));
      const platform = formData.get("platform") || "General";
      const targetAudience = formData.get("target_audience") || null;
      const tone = formData.get("tone") || null;

      const results = await this.abTestIntegration.simulateTest(
        contentA,
        contentB,
        {
          platform,
          targetAudience,
          tone,
        }
      );

      this.displayABTestResults(results);
    } catch (error) {
      console.error("Simulation error:", error);
      this.showToast("Simulation failed: " + error.message, "error");
    }
  }

  async refreshABTestData() {
    try {
      this.showToast("Refreshing data...", "success");

      if (!this.abTestIntegration) {
        this.abTestIntegration = new ABTestIntegration();
      }

      const campaigns = await this.abTestIntegration.getCampaigns({
        limit: 10,
      });
      this.displayCampaigns(campaigns.campaigns);
    } catch (error) {
      console.error("Error refreshing data:", error);
      this.showToast("Failed to refresh data: " + error.message, "error");
    }
  }

  displayCampaigns(campaigns) {
    const abtestResults = document.getElementById("abtestResults");

    if (campaigns.length === 0) {
      abtestResults.innerHTML = `
        <div class="abtest-campaign">
          <div class="campaign-header">
            <div class="campaign-id">No campaigns found</div>
          </div>
          <div class="version-content">Start a new A/B test to see results here.</div>
        </div>
      `;
      return;
    }

    let html = "";
    campaigns.forEach((campaign) => {
      html += this.createCampaignHTML(campaign);
    });

    abtestResults.innerHTML = html;
  }

  createCampaignHTML(campaign) {
    const engagementA =
      (campaign.metrics.A.likes || 0) +
      (campaign.metrics.A.comments || 0) +
      (campaign.metrics.A.shares || 0);
    const engagementB =
      (campaign.metrics.B.likes || 0) +
      (campaign.metrics.B.comments || 0) +
      (campaign.metrics.B.shares || 0);

    return `
      <div class="abtest-campaign">
        <div class="campaign-header">
          <div class="campaign-id">Campaign: ${campaign.campaign_id}</div>
          <div class="campaign-status status-${campaign.status}">${
      campaign.status
    }</div>
        </div>
        
        <div class="campaign-comparison">
          <div class="version-card ${campaign.winner === "A" ? "winner" : ""}">
            <div class="version-label">Version A</div>
            <div class="version-content">${campaign.contentA}</div>
            <div class="version-metrics">
              <div class="metric-item">
                <span class="metric-label">Total</span>
                <span class="metric-value">${engagementA}</span>
              </div>
            </div>
          </div>
          
          <div class="version-card ${campaign.winner === "B" ? "winner" : ""}">
            <div class="version-label">Version B</div>
            <div class="version-content">${campaign.contentB}</div>
            <div class="version-metrics">
              <div class="metric-item">
                <span class="metric-label">Total</span>
                <span class="metric-value">${engagementB}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.marketingGPT = new MarketingGPT();
});

// Add some interactive enhancements
document.addEventListener("DOMContentLoaded", () => {
  // Add smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    });
  });

  // Add keyboard navigation for form
  const form = document.getElementById("contentForm");
  if (form) {
    form.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.target.tagName !== "BUTTON") {
        e.preventDefault();
        const inputs = Array.from(form.querySelectorAll("input, select"));
        const currentIndex = inputs.indexOf(e.target);
        const nextInput = inputs[currentIndex + 1];

        if (nextInput) {
          nextInput.focus();
        } else {
          form.querySelector('button[type="submit"]').click();
        }
      }
    });
  }

  // Add focus effects to form elements
  const formElements = document.querySelectorAll("input, select, button");
  formElements.forEach((element) => {
    element.addEventListener("focus", function () {
      this.style.transform = "translateY(-2px)";
    });

    element.addEventListener("blur", function () {
      this.style.transform = "translateY(0)";
    });
  });
});

// Add error handling for network issues
window.addEventListener("online", () => {
  if (window.marketingGPT) {
    window.marketingGPT.showToast("Connection restored!", "success");
  }
});

window.addEventListener("offline", () => {
  if (window.marketingGPT) {
    window.marketingGPT.showToast(
      "You are offline. Please check your connection.",
      "error"
    );
  }
});

// A/B Testing Admin Functions
function toggleABTestDebug() {
  const debugPanel = document.getElementById("abTestDebug");
  const toggleBtn = document.getElementById("abTestToggle");

  if (debugPanel.classList.contains("show")) {
    debugPanel.classList.remove("show");
    toggleBtn.classList.remove("active");
  } else {
    debugPanel.classList.add("show");
    toggleBtn.classList.add("active");
    updateDebugPanel();
  }
}

function toggleABTestAdmin() {
  const adminPanel = document.getElementById("abTestAdmin");

  if (adminPanel.classList.contains("show")) {
    adminPanel.classList.remove("show");
  } else {
    adminPanel.classList.add("show");
    updateAdminPanel();
  }
}

function updateDebugPanel() {
  const debugContainer = document.getElementById("debugExperiments");
  console.log("Debug Panel: Updating...");

  if (!window.marketingGPT) {
    console.log("Debug Panel: MarketingGPT not found");
    debugContainer.innerHTML = "<p>MarketingGPT not initialized</p>";
    return;
  }

  if (!window.marketingGPT.abTesting) {
    console.log("Debug Panel: A/B Testing not found");
    debugContainer.innerHTML = "<p>A/B Testing not initialized</p>";
    return;
  }

  const activeExperiments =
    window.marketingGPT.abTesting.getActiveExperiments();
  console.log("Debug Panel: Active experiments:", activeExperiments);

  let html = "";

  Object.keys(activeExperiments).forEach((experimentId) => {
    const experiment = activeExperiments[experimentId];
    html += `
      <div class="experiment">
        <div class="experiment-name">${experiment.name}</div>
        <div class="experiment-variant">Variant: ${experiment.variantName}</div>
      </div>
    `;
  });

  if (html === "") {
    html = "<p>No active experiments</p>";
    console.log("Debug Panel: No active experiments found");
  }

  debugContainer.innerHTML = html;
}

function updateAdminPanel() {
  const adminContainer = document.getElementById("adminResults");
  if (!window.marketingGPT || !window.marketingGPT.abTesting) {
    adminContainer.innerHTML = "<p>A/B Testing not initialized</p>";
    return;
  }

  const analytics = window.marketingGPT.abTesting.analytics;
  const activeExperiments =
    window.marketingGPT.abTesting.getActiveExperiments();
  let html = "";

  Object.keys(activeExperiments).forEach((experimentId) => {
    const experiment = activeExperiments[experimentId];
    const conversionRates = analytics.getConversionRate(experimentId);

    html += `
      <div class="experiment-stats">
        <h4>${experiment.name}</h4>
        ${Object.keys(conversionRates)
          .map((variant) => {
            const stats = conversionRates[variant];
            return `
            <div class="variant-stats">
              <div class="variant-name">${variant}:</div>
              <div>Views: ${stats.views}</div>
              <div>Conversions: ${stats.conversions}</div>
              <div class="conversion-rate">Rate: ${stats.conversionRate.toFixed(
                2
              )}%</div>
            </div>
          `;
          })
          .join("")}
      </div>
    `;
  });

  if (html === "") {
    html = "<p>No experiment data available</p>";
  }

  adminContainer.innerHTML = html;
}

// Keyboard shortcuts for A/B testing
document.addEventListener("keydown", (e) => {
  // Ctrl/Cmd + Shift + A to toggle admin panel
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "A") {
    e.preventDefault();
    toggleABTestAdmin();
  }

  // Ctrl/Cmd + Shift + D to toggle debug panel
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "D") {
    e.preventDefault();
    toggleABTestDebug();
  }
});
