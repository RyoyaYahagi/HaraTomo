import assert from "node:assert/strict";
import test from "node:test";
import { calculateSimpleInsights } from "../lib/insights/simple-insight";
import type { EventType } from "../lib/events/schema";

function event(
  type: EventType,
  occurredAt: string,
  label: string,
  normalizedLabel: string | null = null,
) {
  return { type, occurredAt, label, normalizedLabel };
}

test("the six-hour window includes its lower edge and excludes its upper edge", () => {
  const insights = calculateSimpleInsights([
    event("symptom", "2026-09-24T12:00:00.000Z", "腹痛", "abdominal_pain"),
    event("meal", "2026-09-24T06:00:00.000Z", "端の食事"),
    event("meal", "2026-09-24T05:59:59.999Z", "範囲外"),
    event("context", "2026-09-24T12:00:00.000Z", "同時の冷え", "cold_exposure"),
  ]);

  assert.equal(insights.length, 1);
  assert.equal(insights[0].symptomCount, 1);
  assert.deepEqual(insights[0].factors.map(({ label, symptomCount }) => ({ label, symptomCount })), [
    { label: "端の食事", symptomCount: 1 },
  ]);
});

test("repeated factors in one symptom window count once per symptom record", () => {
  const insights = calculateSimpleInsights([
    event("symptom", "2026-09-24T12:00:00.000Z", "腹痛", "abdominal_pain"),
    event("symptom", "2026-09-24T14:00:00.000Z", "お腹が痛い", "abdominal_pain"),
    event("meal", "2026-09-24T09:00:00.000Z", "コーヒー"),
    event("meal", "2026-09-24T10:00:00.000Z", "コーヒー"),
    event("meal", "2026-09-24T12:30:00.000Z", "コーヒー"),
  ]);

  assert.equal(insights.length, 1);
  assert.equal(insights[0].symptomCount, 2);
  assert.equal(insights[0].factors[0].symptomCount, 2);
});

test("symptom categories are aggregated independently by normalized label", () => {
  const insights = calculateSimpleInsights([
    event("symptom", "2026-09-24T12:00:00.000Z", "胃が痛い", "abdominal_pain"),
    event("symptom", "2026-09-24T13:00:00.000Z", "腹痛", "abdominal_pain"),
    event("symptom", "2026-09-24T14:00:00.000Z", "下痢", "diarrhea"),
    event("symptom", "2026-09-24T15:00:00.000Z", "吐き気"),
    event("meal", "2026-09-24T11:00:00.000Z", "おにぎり"),
  ]);

  const bySymptom = Object.fromEntries(insights.map(({ symptomLabel, symptomCount, factors }) => [
    symptomLabel,
    { symptomCount, factorLabels: factors.map(({ label, symptomCount: count }) => [label, count]) },
  ]));
  assert.deepEqual(bySymptom, {
    "腹痛": { symptomCount: 2, factorLabels: [["おにぎり", 2]] },
    "下痢": { symptomCount: 1, factorLabels: [["おにぎり", 1]] },
    "吐き気": { symptomCount: 1, factorLabels: [["おにぎり", 1]] },
  });
});

test("context factors use normalized categories while meals keep raw labels", () => {
  const insights = calculateSimpleInsights([
    event("symptom", "2026-09-24T12:00:00.000Z", "腹痛", "abdominal_pain"),
    event("context", "2026-09-24T08:00:00.000Z", "冷房で冷えた", "cold_exposure"),
    event("context", "2026-09-24T09:00:00.000Z", "外で寒かった", "cold_exposure"),
    event("meal", "2026-09-24T10:00:00.000Z", "ミラノ風ドリア"),
    event("context", "2026-09-24T11:00:00.000Z", "遅くまで起きていた"),
  ]);

  const factorsByLabel = Object.fromEntries(insights[0].factors.map(({ type, label, symptomCount }) => [
    label,
    { type, symptomCount },
  ]));
  assert.deepEqual(factorsByLabel, {
    "冷え": { type: "context", symptomCount: 1 },
    "遅くまで起きていた": { type: "context", symptomCount: 1 },
    "ミラノ風ドリア": { type: "meal", symptomCount: 1 },
  });
});

test("other events are excluded and symptoms without prior factors remain in the denominator", () => {
  const insights = calculateSimpleInsights([
    event("symptom", "2026-09-24T12:00:00.000Z", "腹痛", "abdominal_pain"),
    event("symptom", "2026-09-24T20:00:00.000Z", "お腹が痛い", "abdominal_pain"),
    event("other", "2026-09-24T11:00:00.000Z", "その他の記録"),
    event("meal", "2026-09-24T05:00:00.000Z", "6時間より前"),
  ]);

  assert.equal(insights[0].symptomCount, 2);
  assert.deepEqual(insights[0].factors, []);
});
