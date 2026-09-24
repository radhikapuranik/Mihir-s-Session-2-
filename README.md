# Skinstinct content pipeline

Turns Meera Pillai's raw Telegram notes into publish-ready LinkedIn post drafts written in her
voice. Nothing is ever auto-posted - drafts come back to the Telegram channel for her to review,
edit, and publish herself.

## How it works

1. Meera drops a note (voice-note transcription, observation, anything) into her private
   Telegram channel/chat. The bot is already an admin there.
2. Telegram delivers the new message to `api/telegram-webhook.ts` via webhook.
3. **Merged scoring gate** ([lib/gemini.ts](lib/gemini.ts) `scoreNote`) - Gemini scores the note
   0-10 on one combined judgment: is it substantial (a real claim/data point/anecdote, not a
   fragment) AND on-brand (matches [lib/meeraProfile.ts](lib/meeraProfile.ts) - her role, company,
   voice, audience, and on/off-brand topics). Below 6, the pipeline stops: a short, kind message
   referencing the reason goes back to Telegram, no draft is generated.
4. **News angle from the note itself** ([lib/newsAngle.ts](lib/newsAngle.ts)) - for notes that
   pass, Gemini extracts 3-5 keywords/phrases actually present in the note (not generic industry
   terms), searches Google News RSS (no API key needed) for each, and picks whichever result's
   headline shares the most significant words with those keywords. If nothing matches well,
   no article is passed to drafting.
5. **Draft** (`draftLinkedInPost`) - the note (plus the candidate article, if any) is drafted into
   a full LinkedIn post following [voice-skill.txt](voice-skill.txt) closely. The model decides for
   itself whether the article is actually relevant enough to use - a keyword match alone doesn't
   force it into the post.
6. **Sources block** ([lib/sourcesBlock.ts](lib/sourcesBlock.ts)) - appended only if the article was
   genuinely used; omitted entirely otherwise. If a specific fact from the article was pulled into
   the post body, a "verify before publishing" flag is added above the sources block.
7. The result (draft or rejection message) is sent back to the same Telegram chat for Meera to
   review - nothing is ever auto-posted.

There's no persistence layer (no Supabase or similar) - rejections are reported back over
Telegram but not logged anywhere; add a datastore later if you need a rejection history.

## Project structure

```
api/telegram-webhook.ts   Vercel serverless function - Telegram webhook entry point
lib/config.ts             Loads env vars (throws only when a missing key is actually used)
lib/telegram.ts           Telegram Bot API calls (send message, parse updates)
lib/meeraProfile.ts       Fixed profile block (role, company, voice, audience, on/off-brand topics)
                          embedded in the scoring prompt - edit this directly to tune the gate
lib/gemini.ts             Gemini calls: scoring gate, keyword extraction, drafting prompt
lib/newsAngle.ts          Google News RSS search + relevance matching from the note's own keywords
lib/sourcesBlock.ts       Appends the sources block / verify flag to a finished draft
lib/voiceSkill.ts         Loads voice-skill.txt
lib/pipeline.ts           Wires gate -> news angle -> draft -> sources block together
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

This is a serverless-functions-only backend (Telegram webhook + Gemini calls) - there's no
frontend and no static build output, so `vercel.json` explicitly sets `framework`, `buildCommand`,
and `outputDirectory` to `null` to stop Vercel's dashboard from assuming an "Other" static-site
build and expecting a `public/` folder. Run `npm run typecheck` locally/in CI if you want type
safety checked before deploying - it's not invoked by Vercel itself.

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

- This pipeline never auto-posts. It only ever sends a draft (or a rejection message) back to the
  Telegram chat.
- The scoring gate is a single combined judgment (substance + brand fit), not two averaged scores
  - a well-written note about something off-brand scores low same as a fragment.
- [lib/meeraProfile.ts](lib/meeraProfile.ts) is a best-guess fill-in based on `voice-skill.txt` and
  known context (Skinstinct founder). Edit it directly if it doesn't match how Meera would
  describe her own brand, audience, or on/off-brand topics - it directly drives the gate's fit
  judgment.
