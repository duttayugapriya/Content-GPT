// src/routes/optimizer.routes.js
import { Router } from "express";
import { optimizePosts } from "../utils/optimize.js";
import { appendRowToSheet } from "../utils/sheets.js"; // we'll provide a compatible helper below

const router = Router();

/**
 * POST /api/optimizer/optimize
 * Body: {
 *   posts: [{ post: "...", score: 8.2 }, ...],   // REQUIRED
 *   product_name: "Product X",                   // optional but recommended
 *   content_type: "social",                      // optional
 *   tone: "Energetic",                           // optional (will be forwarded to optimizer)
 *   platform: "Instagram",                       // optional
 *   keywords: "coffee,organic"                   // optional
 * }
 *
 * Response: optimized results and appended rows status
 */
router.post("/optimize", async (req, res) => {
  try {
    const { posts, product_name, content_type, tone, platform, keywords } = req.body;

    if (!posts || !Array.isArray(posts) || posts.length === 0) {
      return res.status(400).json({ success: false, error: "posts array is required in body" });
    }

    // Run optimizer (use your util)
    const optimized = await optimizePosts(posts, {
      platform: platform || "General",
      tone: tone || "Neutral",
      target_audience: req.body.target_audience || "",
      length: req.body.length || "auto",
    });

    // Append each optimized row to the sheet named "content_metrics"
    // Columns we will append: timestamp, product_name, content_type, tone, keywords, original_content, optimized_content, original_score, optimized_score, notes
    const sheetName = "content_metrics";
    const rows = optimized.items.map((it) => [
      new Date().toISOString(),
      product_name || "",
      content_type || "",
      tone || "",
      keywords || "",
      it.original_post,
      it.optimized_post,
      it.original_score ?? "",
      it.optimized_score,
      (it.reasons || []).join("; ") || (it.adjustments || []).join("; ") || "",
    ]);

    // Append rows in a single call (appendRowToSheet returns {success:true/false})
    const appendResult = await appendRowToSheet(sheetName, rows);

    // Respond with optimizer output and append status
    return res.json({
      success: true,
      data: {
        optimized,
        appendResult,
      },
    });
  } catch (err) {
    console.error("Optimizer route error:", err);
    return res.status(500).json({ success: false, error: err.message || String(err) });
  }
});

export default router;