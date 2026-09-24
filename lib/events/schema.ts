import { z } from "zod";

export const eventTypes = ["meal", "symptom", "context", "other"] as const;

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
  });

export type EventType = z.infer<typeof eventTypeSchema>;
export type EventInput = z.infer<typeof eventInputSchema>;
