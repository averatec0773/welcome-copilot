// Generates content/prebaked.json — cached answers for the 4 suggested
// questions, served when the daily demo budget is exhausted.
// Run manually: cd web && npx tsx --env-file=.env.local scripts/prebake.ts
import fs from "node:fs";
import path from "node:path";
import { answerQuestion, SUGGESTED_QUESTIONS } from "../lib/claude";

async function main() {
  const out: Record<string, unknown> = {};
  for (const q of SUGGESTED_QUESTIONS) {
    process.stdout.write(`asking: ${q}\n`);
    out[q] = await answerQuestion(q);
  }
  const dest = path.join(process.cwd(), "content", "prebaked.json");
  fs.writeFileSync(dest, JSON.stringify(out, null, 2));
  process.stdout.write(`wrote ${dest}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
