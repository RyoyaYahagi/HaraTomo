import assert from "node:assert/strict";
import test from "node:test";
import { createReviewDrafts } from "../lib/ai/pipeline";
import type { ExtractedEvent, JevDecision } from "../lib/ai/schema";
import { eventInputSchema } from "../lib/events/schema";

const today = "2026-09-24";

function event(overrides: Partial<ExtractedEvent> = {}): ExtractedEvent {
  return {
    rawType: "meal",
    date: null,
    time: "12:30",
    label: "おにぎり",
    severity: null,
    note: null,
    ...overrides,
  };
}

function decision(overrides: Partial<JevDecision> = {}): JevDecision {
  return {
    type: "meal",
    normalizedLabel: null,
    supportedBySource: true,
    needsClarification: false,
    ...overrides,
  };
}

test("clear multi-event input becomes editable candidates with today's date when omitted", async () => {
  const candidates = await createReviewDrafts("朝にパン、16時に腹痛が6/10", today, {
    extract: async () => ({
      events: [
        event({
          rawType: "symptom",
          time: "16:00",
          label: "腹痛",
          severity: 6,
        }),
        event(),
      ],
    }),
    judge: async (_rawText, candidate) =>
      candidate.rawType === "symptom"
        ? decision({ type: "symptom", normalizedLabel: "abdominal_pain" })
        : decision(),
  });

  assert.equal(candidates.length, 2);
  assert.equal(candidates[0].date, today);
  assert.equal(candidates[0].time, "12:30");
  assert.equal(candidates[1].type, "symptom");
  assert.equal(candidates[1].severity, 6);
  assert.equal(candidates[1].normalizedLabel, "abdominal_pain");
  assert.equal(candidates[1].needsClarification, false);
});

test("ambiguous or missing time remains blank and requires confirmation", async () => {
  const candidates = await createReviewDrafts("夕方に腹痛", today, {
    extract: async () => ({ events: [event({ rawType: "symptom", date: "2026-09-23", time: null, label: "腹痛" })] }),
    judge: async () => decision({ type: "symptom", normalizedLabel: "abdominal_pain" }),
  });

  assert.equal(candidates[0].date, "2026-09-23");
  assert.equal(candidates[0].time, "");
  assert.equal(candidates[0].needsClarification, true);
});

test("other candidates keep their original label without forced normalization", async () => {
  const candidates = await createReviewDrafts("変な感じがした", today, {
    extract: async () => ({ events: [event({ rawType: "other", time: null, label: "変な感じ" })] }),
    judge: async () => decision({ type: "other", normalizedLabel: null }),
  });

  assert.equal(candidates[0].type, "other");
  assert.equal(candidates[0].label, "変な感じ");
  assert.equal(candidates[0].normalizedLabel, "");
  assert.equal(candidates[0].needsClarification, true);
});

test("Jev failure preserves Gemini candidates for confirmation", async () => {
  const candidates = await createReviewDrafts("パンを食べた", today, {
    extract: async () => ({ events: [event({ rawType: null })] }),
    judge: async () => {
      throw new Error("fixture Jev failure");
    },
  });

  assert.equal(candidates[0].type, "other");
  assert.equal(candidates[0].label, "おにぎり");
  assert.equal(candidates[0].supportedBySource, null);
  assert.equal(candidates[0].needsClarification, true);
});

test("Gemini failure is surfaced for manual-entry fallback", async () => {
  await assert.rejects(
    createReviewDrafts("食べた", today, {
      extract: async () => {
        throw new Error("fixture Gemini failure");
      },
      judge: async () => decision(),
    }),
  );
});

test("invalid Gemini output fails Zod validation instead of producing candidates", async () => {
  await assert.rejects(
    createReviewDrafts("食べた", today, {
      extract: async () => ({
        events: [event({ rawType: "meal", date: "2026-02-30", severity: 4 })],
      }),
      judge: async () => decision(),
    }),
  );
});

test("invalid Jev output is treated as uncertain and sent to confirmation", async () => {
  const candidates = await createReviewDrafts("パンを食べた", today, {
    extract: async () => ({ events: [event()] }),
    judge: async () => ({ ...decision(), type: "invalid" }) as unknown as JevDecision,
  });

  assert.equal(candidates[0].type, "meal");
  assert.equal(candidates[0].supportedBySource, null);
  assert.equal(candidates[0].needsClarification, true);
});

test("context normalization cannot remain after Jev changes the candidate to a symptom", async () => {
  const candidates = await createReviewDrafts("冷房で冷えた", today, {
    extract: async () => ({ events: [event({ rawType: "context", label: "冷え" })] }),
    judge: async () =>
      ({
        type: "symptom",
        normalizedLabel: "cold_exposure",
        supportedBySource: true,
        needsClarification: false,
      }) as unknown as JevDecision,
  });

  assert.equal(candidates[0].type, "context");
  assert.equal(candidates[0].normalizedLabel, "");
  assert.equal(candidates[0].supportedBySource, null);
  assert.equal(candidates[0].needsClarification, true);
  assert.equal(
    eventInputSchema.safeParse({
      type: "symptom",
      occurredAt: "2026-09-24T03:00:00.000Z",
      label: "冷え",
      normalizedLabel: "cold_exposure",
    }).success,
    false,
  );
});

test("an empty Gemini event list produces no candidates for the manual fallback path", async () => {
  const candidates = await createReviewDrafts("記録することはありません", today, {
    extract: async () => ({ events: [] }),
    judge: async () => decision(),
  });

  assert.deepEqual(candidates, []);
});
