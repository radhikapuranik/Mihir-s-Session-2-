/**
 * Removes the Telegram webhook, e.g. if you want to pause the pipeline.
 * Usage: npm run delete-webhook
 */
import { config } from "../lib/config.js";

async function main() {
  const res = await fetch(
    `https://api.telegram.org/bot${config.telegramBotToken}/deleteWebhook`,
    { method: "POST" }
  );
  const data = (await res.json()) as { ok: boolean };
  console.log(data);
  if (!res.ok || !data.ok) {
    process.exit(1);
  }
}

main();
