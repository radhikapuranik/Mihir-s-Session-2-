/**
 * One-time setup: point Telegram at the deployed webhook URL.
 *
 * Usage:
 *   WEBHOOK_URL=https://your-app.vercel.app/api/telegram-webhook npm run set-webhook
 *
 * Reads TELEGRAM_BOT_TOKEN and (optionally) TELEGRAM_WEBHOOK_SECRET from .env.
 */
import { config } from "../lib/config.js";

async function main() {
  const webhookUrl = process.env.WEBHOOK_URL;
  if (!webhookUrl) {
    console.error("Set WEBHOOK_URL to your deployed function URL, e.g.\n" +
      "  WEBHOOK_URL=https://your-app.vercel.app/api/telegram-webhook npm run set-webhook");
    process.exit(1);
  }

  const body: Record<string, string> = { url: webhookUrl };
  const secret = config.telegramWebhookSecret;
  if (secret) {
    body.secret_token = secret;
  }

  const res = await fetch(
    `https://api.telegram.org/bot${config.telegramBotToken}/setWebhook`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  const data = (await res.json()) as { ok: boolean };
  console.log(data);
  if (!res.ok || !data.ok) {
    process.exit(1);
  }
}

main();
