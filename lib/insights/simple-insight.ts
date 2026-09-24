import type { EventRow } from "../db/schema";

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

const normalizedLabels: Record<string, string> = {
  abdominal_pain: "腹痛",
  diarrhea: "下痢",
  constipation: "便秘",
  bloating: "膨満感",
  gas: "ガス",
  nausea: "吐き気",
  indigestion: "消化不良",
  bowel_sound: "腸の音",
  cold_exposure: "冷え",
  lack_of_sleep: "睡眠不足",
  stress: "ストレス",
  exercise: "運動",
  alcohol: "飲酒",
  caffeine: "カフェイン",
};

export type InsightFactor = {
  key: string;
  type: "meal" | "context";
  label: string;
  symptomCount: number;
};

export type SimpleInsight = {
  key: string;
  symptomLabel: string;
  symptomCount: number;
  factors: InsightFactor[];
};

type InsightEvent = Pick<EventRow, "type" | "occurredAt" | "label" | "normalizedLabel">;

function displayLabel(label: string): string {
  return normalizedLabels[label] ?? label;
}

function groupingLabel(event: InsightEvent): string {
  if ((event.type === "symptom" || event.type === "context") && event.normalizedLabel?.trim()) {
    return event.normalizedLabel.trim();
  }
  return event.label;
}

export function calculateSimpleInsights(events: InsightEvent[]): SimpleInsight[] {
  const timedEvents = events
    .map((event) => ({ event, time: Date.parse(event.occurredAt) }))
    .filter(({ time }) => Number.isFinite(time));
  const symptoms = timedEvents.filter(({ event }) => event.type === "symptom");

  const groups = new Map<string, {
    label: string;
    symptomCount: number;
    factors: Map<string, InsightFactor>;
  }>();

  for (const { event: symptom, time: symptomTime } of symptoms) {
    const symptomKey = groupingLabel(symptom);
    let group = groups.get(symptomKey);
    if (!group) {
      group = { label: symptomKey, symptomCount: 0, factors: new Map() };
      groups.set(symptomKey, group);
    }
    group.symptomCount += 1;

    const windowStart = symptomTime - SIX_HOURS_MS;
    const factorsBeforeSymptom = new Map<string, Omit<InsightFactor, "symptomCount">>();
    for (const { event, time } of timedEvents) {
      if ((event.type !== "meal" && event.type !== "context") || time < windowStart || time >= symptomTime) {
        continue;
      }
      const factorLabel = groupingLabel(event);
      const factorKey = JSON.stringify([event.type, factorLabel]);
      factorsBeforeSymptom.set(factorKey, {
        key: factorKey,
        type: event.type,
        label: displayLabel(factorLabel),
      });
    }

    for (const [factorKey, factor] of factorsBeforeSymptom) {
      const aggregate = group.factors.get(factorKey);
      if (aggregate) {
        aggregate.symptomCount += 1;
      } else {
        group.factors.set(factorKey, { ...factor, symptomCount: 1 });
      }
    }
  }

  return [...groups.entries()]
    .map(([key, group]) => ({
      key,
      symptomLabel: displayLabel(group.label),
      symptomCount: group.symptomCount,
      factors: [...group.factors.values()].sort((a, b) =>
        b.symptomCount - a.symptomCount || a.label.localeCompare(b.label, "ja") || a.type.localeCompare(b.type),
      ),
    }))
    .sort((a, b) => a.symptomLabel.localeCompare(b.symptomLabel, "ja") || a.key.localeCompare(b.key));
}
