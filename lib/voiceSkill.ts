import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VOICE_SKILL_PATH = path.join(__dirname, "..", "voice-skill.txt");

let cached: string | undefined;

export function loadVoiceSkill(): string {
  if (cached === undefined) {
    cached = readFileSync(VOICE_SKILL_PATH, "utf-8");
  }
  return cached;
}
