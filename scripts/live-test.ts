// One-off manual end-to-end test: polls Telegram getUpdates (no webhook needed yet),
// waits for the next message posted to the channel, runs it through the real
// pipeline, and sends the draft back. Not part of the deployed app.
import { config } from "../lib/config.js";
import { extractIncomingMessage, extractText, sendMessage } from "../lib/telegram.js";
import type { TelegramUpdate } from "../lib/telegram.js";
import { runPipeline } from "../lib/pipeline.js";

async function getUpdates(offset?: number): Promise<TelegramUpdate[]> {
  const url = new URL(`https://api.telegram.org/bot${config.telegramBotToken}/getUpdates`);
  url.searchParams.set("timeout", "20");
  if (offset !== undefined) url.searchParams.set("offset", String(offset));
  const res = await fetch(url);
  const data = (await res.json()) as { ok: boolean; result: TelegramUpdate[] };
  if (!data.ok) throw new Error("getUpdates failed");
  return data.result;
}

async function main() {
  console.log("Draining any old pending updates...");
  const initial = await getUpdates();
  let offset = initial.length ? initial[initial.length - 1].update_id + 1 : undefined;

  console.log("Waiting for a new message in the channel (up to ~2 minutes)...");
  const deadline = Date.now() + 120_000;

  while (Date.now() < deadline) {
    const updates = await getUpdates(offset);
    for (const update of updates) {
      offset = update.update_id + 1;
      const message = extractIncomingMessage(update);
      if (!message) continue;
      const note = extractText(message);
      if (!note || !note.trim()) continue;

      console.log(`\nGot note: "${note}"`);
      console.log("Running pipeline...");
      const result = await runPipeline(note);
      console.log("Pipeline result:", result);

      if (result.status === "drafted") {
        await sendMessage(message.chat.id, `Draft ready for review:\n\n${result.draft}`);
        console.log("Sent draft back to Telegram.");
      } else {
        console.log("Note was skipped - no message sent.");
      }
      return;
    }
  }

  console.log("Timed out waiting for a new message.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
