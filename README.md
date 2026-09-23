# Skinstinct content pipeline

Turns Meera Pillai's raw Telegram notes into publish-ready LinkedIn post drafts written in her
voice. Nothing is ever auto-posted - drafts come back to the Telegram channel for her to review,
edit, and publish herself.

## How it works

1. Meera drops a note (voice-note transcription, observation, anything) into her private
   Telegram channel. The bot is already an admin there.
2. Telegram delivers the new post to `api/telegram-webhook.ts` via webhook.
3. **Gate** ([lib/gemini.ts](lib/gemini.ts) `evaluateNote`) - Gemini judges whether the note has
   enough substance to become a post. Most notes are fragments and get silently dropped here.
4. **Draft** (`draftLinkedInPost`) - notes that pass are drafted into a full LinkedIn post,
   following [voice-skill.txt](voice-skill.txt) closely, optionally grounded with a topical
   reference from [lib/topicalReference.ts](lib/topicalReference.ts) (not wired to a live source
   yet - see that file).
5. The draft is sent back to the same Telegram chat for Meera to review.

## Project structure

```
api/telegram-webhook.ts   Vercel serverless function - Telegram webhook entry point
lib/config.ts             Loads env vars (throws only when a missing key is actually used)
lib/telegram.ts           Telegram Bot API calls (send message, parse updates)
lib/gemini.ts             Gemini calls: the substantiality gate + the drafting prompt
lib/voiceSkill.ts         Loads voice-skill.txt
lib/topicalReference.ts   Placeholder for an optional news/data lookup
lib/pipeline.ts           Wires gate -> topical reference -> draft together
scripts/set-webhook.ts    One-time: point Telegram at your deployed function
scripts/delete-webhook.ts Remove the webhook (pause the pipeline)
voice-skill.txt           Meera's voice profile, used verbatim in the drafting prompt
```

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in:
   - `TELEGRAM_BOT_TOKEN` - from @BotFather
   - `GEMINI_API_KEY` - from Google AI Studio
   - `TELEGRAM_WEBHOOK_SECRET` (optional but recommended) - any random string; Telegram echoes
     it back on every webhook call so the function can reject requests that didn't come from
     Telegram.
3. Confirm `.env` is git-ignored (it already is, via `.gitignore`) before pushing anywhere.

## Local development

```bash
npm run dev
```

This starts the function locally via `vercel dev`. Telegram can't reach `localhost` directly, so
to test the webhook locally you'll need a tunnel (e.g. `ngrok http 3000`) and point
`scripts/set-webhook.ts` at the tunnel URL temporarily.

## Deploying

```bash
vercel deploy --prod
```

Set the same environment variables (`TELEGRAM_BOT_TOKEN`, `GEMINI_API_KEY`,
`TELEGRAM_WEBHOOK_SECRET`) in the Vercel project's Environment Variables settings - `.env` is
local-only and is never uploaded.

Then point Telegram at the deployed URL:

```bash
WEBHOOK_URL=https://<your-app>.vercel.app/api/telegram-webhook npm run set-webhook
```

## Notes

- This pipeline never auto-posts. It only ever sends a draft back to the Telegram chat.
- The gate step exists specifically because most raw notes are fragments - only substantial ones
  reach the (more expensive) drafting step.
