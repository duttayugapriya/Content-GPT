// src/utils/slack.js
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL; // prefer webhook

export async function sendToSlack(text, score) {
  if (!SLACK_WEBHOOK) {
    console.warn("No SLACK_WEBHOOK_URL set, skipping Slack send.");
    return;
  }
  const payload = {
    text: `Content Performance Update:\n${text}\nScore: ${score}`
  };
  await fetch(SLACK_WEBHOOK, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });
}

export async function sendAlertToSlack({ campaign_id, message, severity = "warning", payload = {} }) {
  if (!SLACK_WEBHOOK) {
    console.warn("No SLACK_WEBHOOK_URL set, skipping Slack alert.");
    return;
  }
  const blocks = [
    { type: "section", text: { type: "mrkdwn", text: `*${severity.toUpperCase()}*: ${message}` } },
    { type: "context", elements: [{ type: "mrkdwn", text: `Campaign: ${campaign_id} • ${new Date().toLocaleString()}` }] },
  ];

  const body = { text: `Alert: ${message}`, blocks, attachments: [{ color: severity === "critical" ? "danger" : "warning", fields: Object.keys(payload).map(k => ({ title: k, value: String(payload[k]), short: true })) }] };

  await fetch(SLACK_WEBHOOK, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}
