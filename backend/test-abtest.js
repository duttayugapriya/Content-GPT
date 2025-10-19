// Test script for A/B Testing API
import fetch from "node-fetch";

const API_BASE = "http://localhost:5000/api/abtest";

async function testABTestingAPI() {
  console.log("🧪 Testing A/B Testing API...\n");

  try {
    // Test 1: Start A/B Test
    console.log("1. Starting A/B test...");
    const startResponse = await fetch(`${API_BASE}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contentA:
          "Discover our amazing new product! Click to learn more and transform your life today!",
        contentB:
          "🚀 Ready to transform your life? Our new product is here! Don't miss out - click now!",
        platform: "Instagram",
        target_audience: "Young professionals",
        tone: "Energetic",
      }),
    });

    const startData = await startResponse.json();
    console.log("✅ A/B test started:", startData.data.campaign_id);
    const campaignId = startData.data.campaign_id;

    // Test 2: Update Metrics (Simulated)
    console.log("\n2. Updating metrics with simulation...");
    const updateResponse = await fetch(`${API_BASE}/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaign_id: campaignId,
        simulate: true,
      }),
    });

    const updateData = await updateResponse.json();
    console.log("✅ Metrics updated:");
    console.log("   Version A engagement:", updateData.data.total_engagement_a);
    console.log("   Version B engagement:", updateData.data.total_engagement_b);

    // Test 3: Complete A/B Test
    console.log("\n3. Completing A/B test...");
    const completeResponse = await fetch(`${API_BASE}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaign_id: campaignId,
      }),
    });

    const completeData = await completeResponse.json();
    console.log("✅ A/B test completed:");
    console.log("   Winner:", completeData.data.winner);
    console.log(
      "   Improvement:",
      completeData.data.performance_summary.improvement_percentage + "%"
    );

    // Test 4: Get Results
    console.log("\n4. Getting detailed results...");
    const resultsResponse = await fetch(`${API_BASE}/result/${campaignId}`);
    const resultsData = await resultsResponse.json();

    console.log("✅ Detailed results:");
    console.log("   Winner:", resultsData.data.winner);
    console.log("   Platform:", resultsData.data.platform);
    console.log(
      "   AI Feedback available:",
      !!resultsData.data.feedback_prompt
    );

    // Test 5: Get Statistics
    console.log("\n5. Getting statistics...");
    const statsResponse = await fetch(`${API_BASE}/statistics`);
    const statsData = await statsResponse.json();

    console.log("✅ Statistics:");
    console.log(
      "   Total campaigns:",
      statsData.data.statistics.total_campaigns
    );
    console.log("   A wins:", statsData.data.statistics.a_wins);
    console.log("   B wins:", statsData.data.statistics.b_wins);

    // Test 6: Get All Campaigns
    console.log("\n6. Getting all campaigns...");
    const campaignsResponse = await fetch(`${API_BASE}/campaigns?limit=5`);
    const campaignsData = await campaignsResponse.json();

    console.log("✅ Campaigns retrieved:", campaignsData.data.campaigns.length);

    console.log("\n🎉 All tests completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testABTestingAPI();
}

export { testABTestingAPI };
