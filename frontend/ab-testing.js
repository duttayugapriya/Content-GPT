// A/B Testing Module for Marketing GPT
class ABTesting {
  constructor() {
    this.experiments = new Map();
    this.userId = this.getOrCreateUserId();
    this.analytics = new Analytics();
    this.init();
  }

  init() {
    console.log("A/B Testing: Initializing...");
    this.loadExperiments();
    this.runActiveExperiments();
    console.log(
      "A/B Testing: Initialized with",
      this.experiments.size,
      "experiments"
    );
  }

  getOrCreateUserId() {
    let userId = localStorage.getItem("marketing_gpt_user_id");
    if (!userId) {
      userId =
        "user_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
      localStorage.setItem("marketing_gpt_user_id", userId);
    }
    return userId;
  }

  loadExperiments() {
    // Define A/B test experiments
    this.experiments.set("cta_button_color", {
      name: "CTA Button Color Test",
      variants: {
        control: {
          name: "Original Purple",
          cssClass: "btn-original",
          weight: 50,
        },
        variant_a: {
          name: "Green Gradient",
          cssClass: "btn-green",
          weight: 25,
        },
        variant_b: {
          name: "Orange Gradient",
          cssClass: "btn-orange",
          weight: 25,
        },
      },
      active: true,
      startDate: new Date("2024-01-01"),
      endDate: new Date("2025-12-31"),
    });

    this.experiments.set("form_layout", {
      name: "Form Layout Test",
      variants: {
        control: {
          name: "Grid Layout",
          cssClass: "form-grid",
          weight: 50,
        },
        variant_a: {
          name: "Single Column",
          cssClass: "form-single-column",
          weight: 25,
        },
        variant_b: {
          name: "Two Column",
          cssClass: "form-two-column",
          weight: 25,
        },
      },
      active: true,
      startDate: new Date("2024-01-01"),
      endDate: new Date("2025-12-31"),
    });

    this.experiments.set("headline_style", {
      name: "Headline Style Test",
      variants: {
        control: {
          name: "Original Style",
          cssClass: "headline-original",
          weight: 50,
        },
        variant_a: {
          name: "Bold Style",
          cssClass: "headline-bold",
          weight: 25,
        },
        variant_b: {
          name: "Gradient Style",
          cssClass: "headline-gradient",
          weight: 25,
        },
      },
      active: true,
      startDate: new Date("2024-01-01"),
      endDate: new Date("2025-12-31"),
    });

    this.experiments.set("features_section", {
      name: "Features Section Test",
      variants: {
        control: {
          name: "Original Features",
          cssClass: "features-original",
          weight: 50,
        },
        variant_a: {
          name: "Minimal Features",
          cssClass: "features-minimal",
          weight: 25,
        },
        variant_b: {
          name: "Detailed Features",
          cssClass: "features-detailed",
          weight: 25,
        },
      },
      active: true,
      startDate: new Date("2024-01-01"),
      endDate: new Date("2025-12-31"),
    });
  }

  runActiveExperiments() {
    console.log("A/B Testing: Running active experiments...");
    let activeCount = 0;
    this.experiments.forEach((experiment, experimentId) => {
      if (this.isExperimentActive(experiment)) {
        activeCount++;
        const variant = this.assignUserToVariant(experimentId, experiment);
        console.log(`A/B Testing: ${experimentId} -> ${variant}`);
        this.applyVariant(experimentId, variant);
        this.trackExperimentView(experimentId, variant);
      }
    });
    console.log(`A/B Testing: ${activeCount} active experiments running`);
  }

  isExperimentActive(experiment) {
    const now = new Date();
    return (
      experiment.active &&
      now >= experiment.startDate &&
      now <= experiment.endDate
    );
  }

  assignUserToVariant(experimentId, experiment) {
    // Check if user already has a variant assigned
    const storedVariant = localStorage.getItem(`ab_test_${experimentId}`);
    if (storedVariant && experiment.variants[storedVariant]) {
      return storedVariant;
    }

    // Assign user to variant based on weights
    const variants = Object.keys(experiment.variants);
    const weights = variants.map((v) => experiment.variants[v].weight);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

    const random = Math.random() * totalWeight;
    let currentWeight = 0;

    for (let i = 0; i < variants.length; i++) {
      currentWeight += weights[i];
      if (random <= currentWeight) {
        const selectedVariant = variants[i];
        localStorage.setItem(`ab_test_${experimentId}`, selectedVariant);
        return selectedVariant;
      }
    }

    // Fallback to control
    localStorage.setItem(`ab_test_${experimentId}`, "control");
    return "control";
  }

  applyVariant(experimentId, variant) {
    const experiment = this.experiments.get(experimentId);
    const variantData = experiment.variants[variant];

    if (!variantData) return;

    // Apply CSS class to body for global styling
    document.body.classList.add(`ab-test-${experimentId}-${variant}`);

    // Apply specific variant classes
    this.applyVariantStyles(experimentId, variant, variantData);
  }

  applyVariantStyles(experimentId, variant, variantData) {
    switch (experimentId) {
      case "cta_button_color":
        this.applyButtonColorVariant(variantData);
        break;
      case "form_layout":
        this.applyFormLayoutVariant(variantData);
        break;
      case "headline_style":
        this.applyHeadlineVariant(variantData);
        break;
      case "features_section":
        this.applyFeaturesVariant(variantData);
        break;
    }
  }

  applyButtonColorVariant(variantData) {
    const button = document.getElementById("generateBtn");
    if (button) {
      button.className = button.className.replace(/btn-\w+/g, "");
      button.classList.add("generate-btn", variantData.cssClass);
    }
  }

  applyFormLayoutVariant(variantData) {
    const formGrid = document.querySelector(".form-grid");
    if (formGrid) {
      formGrid.className = formGrid.className.replace(/form-\w+-column/g, "");
      formGrid.classList.add(variantData.cssClass);
    }
  }

  applyHeadlineVariant(variantData) {
    const headline = document.querySelector(".form-container h2");
    if (headline) {
      headline.className = headline.className.replace(/headline-\w+/g, "");
      headline.classList.add(variantData.cssClass);
    }
  }

  applyFeaturesVariant(variantData) {
    const featuresSection = document.querySelector(".features-section");
    if (featuresSection) {
      featuresSection.className = featuresSection.className.replace(
        /features-\w+/g,
        ""
      );
      featuresSection.classList.add(variantData.cssClass);
    }
  }

  trackExperimentView(experimentId, variant) {
    this.analytics.track("experiment_view", {
      experiment_id: experimentId,
      variant: variant,
      user_id: this.userId,
      timestamp: new Date().toISOString(),
    });
  }

  trackConversion(eventName, experimentId, variant, additionalData = {}) {
    this.analytics.track("conversion", {
      event_name: eventName,
      experiment_id: experimentId,
      variant: variant,
      user_id: this.userId,
      timestamp: new Date().toISOString(),
      ...additionalData,
    });
  }

  // Method to manually trigger conversion tracking
  trackFormSubmission(experimentId, variant, formData) {
    this.trackConversion("form_submission", experimentId, variant, {
      product_name: formData.product_name,
      platform: formData.platform,
      tone: formData.tone,
    });
  }

  trackContentGeneration(experimentId, variant, results) {
    this.trackConversion("content_generated", experimentId, variant, {
      posts_count: results.length,
      avg_score:
        results.reduce((sum, post) => sum + post.score, 0) / results.length,
    });
  }

  trackButtonClick(buttonType, experimentId, variant) {
    this.trackConversion("button_click", experimentId, variant, {
      button_type: buttonType,
    });
  }

  // Get current variant for an experiment
  getCurrentVariant(experimentId) {
    return localStorage.getItem(`ab_test_${experimentId}`) || "control";
  }

  // Get all active experiments for current user
  getActiveExperiments() {
    const active = {};
    this.experiments.forEach((experiment, experimentId) => {
      if (this.isExperimentActive(experiment)) {
        active[experimentId] = {
          name: experiment.name,
          variant: this.getCurrentVariant(experimentId),
          variantName:
            experiment.variants[this.getCurrentVariant(experimentId)]?.name,
        };
      }
    });
    return active;
  }

  // Admin method to get experiment results
  getExperimentResults(experimentId) {
    // This would typically fetch from your analytics backend
    return this.analytics.getExperimentResults(experimentId);
  }
}

// Analytics class for tracking events
class Analytics {
  constructor() {
    this.events = [];
    this.init();
  }

  init() {
    // Initialize analytics (could integrate with Google Analytics, Mixpanel, etc.)
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Track form submissions
    document.addEventListener("DOMContentLoaded", () => {
      const form = document.getElementById("contentForm");
      if (form) {
        form.addEventListener("submit", (e) => {
          this.track("form_submit_attempt", {
            timestamp: new Date().toISOString(),
          });
        });
      }
    });
  }

  track(eventName, properties = {}) {
    const event = {
      event: eventName,
      properties: {
        ...properties,
        user_agent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      },
    };

    this.events.push(event);

    // Send to analytics service (implement based on your needs)
    this.sendToAnalytics(event);

    // Store locally for debugging
    this.storeEventLocally(event);
  }

  sendToAnalytics(event) {
    // Example: Send to your backend analytics endpoint
    fetch("/api/analytics/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }).catch((error) => {
      console.log("Analytics tracking failed:", error);
    });
  }

  storeEventLocally(event) {
    const stored = JSON.parse(
      localStorage.getItem("marketing_gpt_analytics") || "[]"
    );
    stored.push(event);

    // Keep only last 100 events
    if (stored.length > 100) {
      stored.splice(0, stored.length - 100);
    }

    localStorage.setItem("marketing_gpt_analytics", JSON.stringify(stored));
  }

  getExperimentResults(experimentId) {
    // This would typically fetch from your analytics backend
    const events = JSON.parse(
      localStorage.getItem("marketing_gpt_analytics") || "[]"
    );
    return events.filter(
      (event) => event.properties.experiment_id === experimentId
    );
  }

  // Get conversion rates for an experiment
  getConversionRate(experimentId) {
    const events = this.getExperimentResults(experimentId);
    const views = events.filter((e) => e.event === "experiment_view");
    const conversions = events.filter((e) => e.event === "conversion");

    const variantStats = {};

    views.forEach((view) => {
      const variant = view.properties.variant;
      if (!variantStats[variant]) {
        variantStats[variant] = { views: 0, conversions: 0 };
      }
      variantStats[variant].views++;
    });

    conversions.forEach((conversion) => {
      const variant = conversion.properties.variant;
      if (variantStats[variant]) {
        variantStats[variant].conversions++;
      }
    });

    // Calculate conversion rates
    Object.keys(variantStats).forEach((variant) => {
      const stats = variantStats[variant];
      stats.conversionRate =
        stats.views > 0 ? (stats.conversions / stats.views) * 100 : 0;
    });

    return variantStats;
  }
}

// Export for use in other modules
window.ABTesting = ABTesting;
window.Analytics = Analytics;
