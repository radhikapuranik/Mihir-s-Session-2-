import "dotenv/config";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Add it to your .env file (see .env.example).`
    );
  }
  return value;
}

// Lazy getters so importing this module never fails at load time -
// only the code path that actually needs a key throws, and only when called.
export const config = {
  get telegramBotToken() {
    return requireEnv("TELEGRAM_BOT_TOKEN");
  },
  get geminiApiKey() {
    return requireEnv("GEMINI_API_KEY");
  },
  get telegramWebhookSecret() {
    return process.env.TELEGRAM_WEBHOOK_SECRET || undefined;
  },
};
