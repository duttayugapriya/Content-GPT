import axios from "axios";

export async function sendToSlack(post, score) {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  const message = {
    text: `💡 *New AI-Generated Post Idea!*
> ${post}

Predicted engagement score: *${score}/10*`,
  };
  await axios.post(webhook, message);
}
