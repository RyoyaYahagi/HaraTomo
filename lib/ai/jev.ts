import "server-only";

import { choice, noul, TypeSafeClient } from "@typesafe-ai/sdk";
import { contextNormalizationLabels, symptomNormalizationLabels } from "../events/schema";
import type { ExtractedEvent, JevDecision } from "./schema";

const JEV_MODEL = "jev-latest";
const BOOLEAN_THRESHOLD = 0.5;
const symptomLabels = new Set([...symptomNormalizationLabels, "other"]);
const contextLabels = new Set([...contextNormalizationLabels, "other"]);

const typeCriteria = {
  meal: "The event is food or drink the user consumed.",
  symptom: "The event is a symptom or bodily sensation experienced by the user.",
  context: "The event is a life factor such as cold, sleep, stress, exercise, alcohol, or caffeine.",
  other: "The event does not clearly fit meal, symptom, or context.",
};

const normalizedLabelCriteria = {
  abdominal_pain: "Abdominal pain or stomachache (symptom).",
  diarrhea: "Diarrhea or loose stool (symptom).",
  constipation: "Constipation (symptom).",
  bloating: "Bloating or abdominal fullness (symptom).",
  gas: "Gas or flatulence (symptom).",
  nausea: "Nausea (symptom).",
  indigestion: "Indigestion or difficulty digesting (symptom).",
  bowel_sound: "Bowel sounds (symptom).",
  cold_exposure: "Exposure to cold or feeling chilled (context).",
  lack_of_sleep: "Lack of sleep (context).",
  stress: "Stress (context).",
  exercise: "Exercise (context).",
  alcohol: "Alcohol consumption (context).",
  caffeine: "Caffeine consumption (context).",
  other: "No listed category clearly matches.",
};

export async function judgeEvent(rawText: string, candidate: ExtractedEvent): Promise<JevDecision> {
  const apiKey = process.env.TYPESAFE_API_KEY;
  if (!apiKey) throw new Error("Jev is not configured");

  const client = new TypeSafeClient({ apiKey, defaultModel: JEV_MODEL });
  const response = await client.systemOne({
    model: JEV_MODEL,
    state: { sourceText: rawText, candidate },
    questions: {
      eventType: choice(
        "Select the best event type based only on the candidate and source text.",
        typeCriteria,
      ),
      normalizedLabel: choice(
        "For a symptom or context event, select its matching listed category. For meal or other, choose other. Preserve the original label in the application.",
        normalizedLabelCriteria,
      ),
      supportedBySource: noul(
        "Does the source text explicitly support the candidate's event label, type, and any stated detail? Do not infer medical truth or causation.",
      ),
      needsClarification: noul(
        "Does a detail needed to record this candidate require clarification from the user? An unspecified or ambiguous time requires clarification.",
      ),
    },
  });

  const type = response.answers.eventType.choice;
  const selectedNormalization = response.answers.normalizedLabel.choice;
  const normalizationFitsType =
    type === "symptom"
      ? symptomLabels.has(selectedNormalization)
      : type === "context"
        ? contextLabels.has(selectedNormalization)
        : selectedNormalization === "other";
  const normalizedLabel =
    normalizationFitsType && selectedNormalization !== "other"
      ? selectedNormalization
      : null;

  return {
    type,
    normalizedLabel,
    supportedBySource: response.answers.supportedBySource.noul >= BOOLEAN_THRESHOLD,
    needsClarification:
      response.answers.needsClarification.noul >= BOOLEAN_THRESHOLD || !normalizationFitsType,
  };
}
