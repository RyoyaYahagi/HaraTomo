import { readFile } from "node:fs/promises";
import { createReviewDrafts } from "../lib/ai/pipeline";
import { extractEvents } from "../lib/ai/extract";
import { judgeEvent } from "../lib/ai/jev";
import type { ReviewDraft } from "../lib/ai/schema";

type ExpectedEvent = {
  type: ReviewDraft["type"];
  date?: string;
  time?: string;
  normalizedLabel?: string;
  severity?: number | null;
  labelIncludesAny?: string[];
  needsClarification?: boolean;
};

type EvalCase = {
  id: string;
  smoke: boolean;
  today: string;
  input: string;
  expected: ExpectedEvent[];
};

function matches(actual: ReviewDraft, expected: ExpectedEvent): boolean {
  if (actual.type !== expected.type) return false;
  if (expected.date !== undefined && actual.date !== expected.date) return false;
  if (expected.time !== undefined && actual.time !== expected.time) return false;
  if (
    expected.normalizedLabel !== undefined &&
    actual.normalizedLabel !== expected.normalizedLabel
  ) return false;
  if ("severity" in expected && actual.severity !== expected.severity) return false;
  if (
    expected.needsClarification !== undefined &&
    actual.needsClarification !== expected.needsClarification
  ) return false;
  if (
    expected.labelIncludesAny?.length &&
    !expected.labelIncludesAny.some((term) => actual.label.includes(term))
  ) return false;
  return true;
}

function evaluate(actual: ReviewDraft[], expected: ExpectedEvent[]) {
  if (actual.length !== expected.length) {
    return { ok: false, reason: `event count: expected ${expected.length}, got ${actual.length}` };
  }

  const unused = new Set(actual.map((_, index) => index));
  for (const expectedEvent of expected) {
    const matchIndex = [...unused].find((index) => matches(actual[index], expectedEvent));
    if (matchIndex === undefined) {
      return {
        ok: false,
        reason: `no event matched ${JSON.stringify(expectedEvent)}`,
      };
    }
    unused.delete(matchIndex);
  }

  return { ok: true, reason: "" };
}

async function main() {
  if (!process.env.GEMINI_API_KEY || !process.env.TYPESAFE_API_KEY) {
    console.error("GEMINI_API_KEY and TYPESAFE_API_KEY are required for live AI evals.");
    process.exitCode = 2;
    return;
  }

  const raw = await readFile(new URL("./cases.json", import.meta.url), "utf8");
  const allCases = JSON.parse(raw) as EvalCase[];
  const smokeOnly = process.argv.includes("--smoke");
  const selected = smokeOnly ? allCases.filter((item) => item.smoke) : allCases;

  let failed = 0;
  for (const item of selected) {
    try {
      const actual = await createReviewDrafts(item.input, item.today, {
        extract: extractEvents,
        judge: judgeEvent,
      });
      const result = evaluate(actual, item.expected);
      if (result.ok) {
        console.log(`PASS ${item.id}`);
      } else {
        failed += 1;
        console.error(`FAIL ${item.id}: ${result.reason}`);
        console.error(JSON.stringify(actual, null, 2));
      }
    } catch (error) {
      failed += 1;
      console.error(
        `ERROR ${item.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  console.log(`\nAI eval: ${selected.length - failed}/${selected.length} passed`);
  if (failed > 0) process.exitCode = 1;
}

await main();
