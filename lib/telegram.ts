import { config } from "./config.js";

export interface TelegramMessage {
  message_id: number;
  chat: { id: number };
  text?: string;
  caption?: string;
  date: number;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  channel_post?: TelegramMessage;
}

function apiUrl(method: string): string {
  return `https://api.telegram.org/bot${config.telegramBotToken}/${method}`;
}

// Voice notes arrive to the channel already transcribed to text upstream;
// this only ever reads `text`/`caption` off the update.
export function extractIncomingMessage(update: TelegramUpdate): TelegramMessage | undefined {
  return update.channel_post ?? update.message;
}

export function extractText(message: TelegramMessage): string | undefined {
  return message.text ?? message.caption;
}

export async function sendMessage(chatId: number, text: string): Promise<void> {
  const res = await fetch(apiUrl("sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram sendMessage failed (${res.status}): ${body}`);
  }
}
