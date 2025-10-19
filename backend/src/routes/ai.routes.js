import { generateContent } from "../controllers/ai.controllers.js";
import { Router } from "express";
import { sendToSlack } from "../utils/slack.js";

const router = Router();

// Generate AI posts + append to Sheets + send Slack
router.route("/generate").post(generateContent);

// Optional: manual Slack send (frontend button)
router.route("/slack").post(async (req, res) => {
  try {
    const { post, score } = req.body;
    await sendToSlack(post, score);
    res.json({ success: true, message: "Sent to Slack" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
