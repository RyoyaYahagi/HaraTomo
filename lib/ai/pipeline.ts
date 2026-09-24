import { eventTypes } from "../events/schema";
import {
  extractionResponseSchema,
  jevDecisionSchema,
  type ExtractedEvent,
  type JevDecision,
  type ReviewDraft,
} from "./schema";

export type RecordingPipelineDependencies = {
  extract: (rawText: string, today: string) => Promise<unknown>;
  judge: (rawText: string, candidate: ExtractedEvent) => Promise<JevDecision>;
};

function fallbackType(rawType: string | null): ReviewDraft["type"] {
  return eventTypes.includes(rawType as ReviewDraft["type"])
    ? (rawType as ReviewDraft["type"])
    : "other";
}

export async function createReviewDrafts(
  rawText: string,
  today: string,
  dependencies: RecordingPipelineDependencies,
): Promise<ReviewDraft[]> {
  const extracted = extractionResponseSchema.parse(await dependencies.extract(rawText, today));

  const drafts = await Promise.all(
    extracted.events.map(async (candidate) => {
      const base = {
        date: candidate.date ?? today,
        time: candidate.time ?? "",
        label: candidate.label,
        severity: candidate.severity,
        note: candidate.note ?? "",
      };

      try {
        const decision = jevDecisionSchema.parse(await dependencies.judge(rawText, candidate));
        const normalizedLabel =
          (decision.type === "symptom" || decision.type === "context") && decision.normalizedLabel !== "other"
            ? decision.normalizedLabel ?? ""
            : "";
        return {
          ...base,
          type: decision.type,
          normalizedLabel,
          supportedBySource: decision.supportedBySource,
          needsClarification:
            decision.needsClarification ||
            !decision.supportedBySource ||
            candidate.time === null ||
            (candidate.severity !== null && decision.type !== "symptom"),
        };
      } catch {
        return {
          ...base,
          type: fallbackType(candidate.rawType),
          normalizedLabel: "",
          supportedBySource: null,
          needsClarification: true,
        };
      }
    }),
  );

  return drafts.sort((left, right) => {
    const leftTime = left.time || "99:99";
    const rightTime = right.time || "99:99";
    return `${left.date}T${leftTime}`.localeCompare(`${right.date}T${rightTime}`);
  });
}
