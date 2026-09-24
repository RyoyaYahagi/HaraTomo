import { z } from "zod";

export const eventTypes = ["meal", "symptom", "context", "other"] as const;

export const symptomNormalizationLabels = [
  "abdominal_pain",
  "diarrhea",
  "constipation",
  "bloating",
  "gas",
  "nausea",
  "indigestion",
  "bowel_sound",
] as const;

export const contextNormalizationLabels = [
  "cold_exposure",
  "lack_of_sleep",
  "stress",
  "exercise",
  "alcohol",
  "caffeine",
] as const;

export const eventTypeSchema = z.enum(eventTypes);

export const eventInputSchema = z
  .object({
    type: eventTypeSchema,
    occurredAt: z.iso.datetime({ offset: true }),
    label: z.string().trim().min(1, "内容を入力してください"),
    normalizedLabel: z.string().trim().nullish(),
    severity: z.number().int().min(0).max(10).nullish(),
    note: z.string().nullish(),
    rawText: z.string().nullish(),
  })
  .superRefine((event, context) => {
    if (event.type !== "symptom" && event.severity != null) {
      context.addIssue({
        code: "custom",
        path: ["severity"],
        message: "症状以外には強さを設定できません",
      });
    }
    if (event.normalizedLabel == null) return;

    const valid =
      event.type === "symptom"
        ? symptomNormalizationLabels.includes(
            event.normalizedLabel as (typeof symptomNormalizationLabels)[number],
          )
        : event.type === "context"
          ? contextNormalizationLabels.includes(
              event.normalizedLabel as (typeof contextNormalizationLabels)[number],
            )
          : false;
    if (!valid) {
      context.addIssue({
        code: "custom",
        path: ["normalizedLabel"],
        message: "分類名が種類と一致しません",
      });
    }
  });

export type EventType = z.infer<typeof eventTypeSchema>;
export type EventInput = z.infer<typeof eventInputSchema>;
