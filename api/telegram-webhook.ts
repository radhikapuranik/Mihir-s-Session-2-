import type { VercelRequest, VercelResponse } from "@vercel/node";
import { config } from "../lib/config.js";
import { extractIncomingMessage, extractText, sendMessage } from "../lib/telegram.js";
import { runPipeline } from "../lib/pipeline.js";
import type { TelegramUpdate } from "../lib/telegram.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const expectedSecret = config.telegramWebhookSecret;
  if (expectedSecret) {
    const receivedSecret = req.headers["x-telegram-bot-api-secret-token"];
    if (receivedSecret !== expectedSecret) {
      res.status(401).send("Unauthorized");
      return;
    }
  }

  const update = req.body as TelegramUpdate;
  const message = extractIncomingMessage(update);

  // Always 200 back to Telegram quickly so it doesn't retry - even when we have
  // nothing to do with this update (no text, or it's not from the channel).
  if (!message) {
    res.status(200).send("ok");
    return;
  }

  const note = extractText(message);
  if (!note || !note.trim()) {
    res.status(200).send("ok");
    return;
  }

  // Run to completion before responding - Vercel can freeze the function's compute
  // as soon as a response is sent, so a "reply now, work in the background" pattern
  // here would risk the pipeline getting killed mid-run.
  try {
    const result = await runPipeline(note);
    if (result.status === "drafted") {
      await sendMessage(message.chat.id, `Draft ready for review:\n\n${result.draft}`);
    } else {
      await sendMessage(message.chat.id, result.message);
    }
  } catch (err) {
    console.error("Pipeline error:", err);
    try {
      await sendMessage(
        message.chat.id,
        "Something went wrong turning that note into a draft. Check the function logs."
      );
    } catch (notifyErr) {
      console.error("Failed to notify about pipeline error:", notifyErr);
    }
  }

  res.status(200).send("ok");
}
